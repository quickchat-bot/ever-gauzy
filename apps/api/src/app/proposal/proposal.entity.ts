import {
	Column,
	Entity,
	Index,
	JoinColumn,
	RelationId,
	ManyToOne
} from 'typeorm';
import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import {
	IsNotEmpty,
	IsString,
	IsNumber,
	IsOptional,
	IsDate,
	IsEnum
} from 'class-validator';
import { Base } from '../core/entities/base';
import { Proposal as IProposal } from '@gauzy/models';
import { Employee } from '../employee';

@Entity('proposal')
export class Proposal extends Base implements IProposal {
	@ApiModelProperty({ type: Employee })
	@ManyToOne((type) => Employee, { nullable: true, onDelete: 'CASCADE' })
	@JoinColumn()
	employee: Employee;

	@ApiModelProperty({ type: String, readOnly: true })
	@RelationId((proposal: Proposal) => proposal.employee)
	@IsString()
	@Column({ nullable: true })
	readonly employeeId?: string;

	@ApiModelProperty({ type: String })
	@Index()
	@IsString()
	@IsNotEmpty()
	@Column({ nullable: true })
	jobPostUrl: string;

	@ApiModelPropertyOptional({ type: Date })
	@IsDate()
	@IsOptional()
	@Column({ nullable: true })
	valueDate?: Date;

	@ApiModelPropertyOptional({ type: String })
	@IsString()
	@IsOptional()
	@Column()
	jobPostContent?: string;

	@ApiModelPropertyOptional({ type: String })
	@IsString()
	@IsOptional()
	@Column()
	proposalContent?: string;
}
