import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
	BadRequestException,
	Injectable,
	NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
	IsNull,
	MoreThanOrEqual,
	Repository,
	SelectQueryBuilder
} from 'typeorm';
import {
	IEmailReset,
	IEmailResetFindInput,
	LanguagesEnum
} from '@gauzy/contracts';
import { RequestContext } from '../core/context';
import { UserService } from '../user/user.service';
import { TenantAwareCrudService } from '../core/crud';
import { EmailReset } from './email-reset.entity';
import { UserEmailDTO } from '../user/dto';
import { generateRandomInteger } from './../core/utils';
import { EmailResetCreateCommand } from './commands';
import { EmailResetGetQuery } from './queries';
import { VerifyEmailResetRequestDTO } from './dto/verify-email-reset-request.dto';
import { EmailService } from '../email/email.service';
import { EmployeeService } from './../employee/employee.service';
import { AuthService } from './../auth/auth.service';

@Injectable()
export class EmailResetService extends TenantAwareCrudService<EmailReset> {
	constructor(
		@InjectRepository(EmailReset)
		private readonly _emailResetRepository: Repository<EmailReset>,
		private readonly userService: UserService,
		private readonly commandBus: CommandBus,
		private readonly queryBus: QueryBus,
		private readonly emailService: EmailService,
		private readonly employeeService: EmployeeService,
		private readonly authService: AuthService
	) {
		super(_emailResetRepository);
	}

	async requestChangeEmail(
		request: UserEmailDTO,
		languageCode: LanguagesEnum
	) {
		let user = RequestContext.currentUser();
		user = await this.userService.findOneByIdString(user.id, {
			relations: {
				role: true,
				employee: true
			},
		});
		const token = await this.authService.getJwtAccessToken(user);

		/**
		 * User with email already exist
		 */
		if (
			user.email === request.email ||
			(await this.userService.checkIfExistsEmail(request.email))
		) {
			return true;
		}
		const verificationCode = generateRandomInteger(6);
		await this.commandBus.execute(
			new EmailResetCreateCommand({
				code: verificationCode,
				email: request.email,
				oldEmail: user.email,
				userId: user.id,
				token
			})
		);
		const employee = await this.employeeService.findOneByIdString(
			user.employeeId,
			{
				relations: ['organization']
			}
		);
		const { organization } = employee;

		this.emailService.emailReset(
			{
				...user,
				email: request.email
			},
			languageCode || (user.preferredLanguage as LanguagesEnum),
			verificationCode,
			organization
		);

		return true;
	}

	async verifyCode(request: VerifyEmailResetRequestDTO) {
		try {
			const { code } = request;
			const user = RequestContext.currentUser();

			const record: IEmailReset = await this.queryBus.execute(
				new EmailResetGetQuery({
					code,
					oldEmail: user.email,
					userId: user.id
				})
			);

			if (
				!record || 
				/**
			 	* Check if other user has already registered with same email
			 	*/
				(await this.userService.checkIfExistsEmail(record.email))
				) {
				throw new BadRequestException('Email Reset Failed.');
			}

			await this.userService.update(
				{
					id: record.userId
				},
				{
					email: record.email
				}
			);

			return true;
		} catch (error) {
			throw new BadRequestException('Email Reset Failed.');
		}
	}

	async getEmailResetIfCodeMatches(input: IEmailResetFindInput) {
		try {
			const query =
				this._emailResetRepository.createQueryBuilder('email_reset');
			query.where((qb: SelectQueryBuilder<EmailReset>) => {
				qb.andWhere(input);
				qb.andWhere([
					{
						expiredAt: MoreThanOrEqual(new Date())
					},
					{
						expiredAt: IsNull()
					},
				]);

				qb.orderBy(`"${qb.alias}"."createdAt"`, 'DESC');
			});

			return await query.getOneOrFail();
		} catch (error) {
			throw new NotFoundException(error);
		}
	}
}
