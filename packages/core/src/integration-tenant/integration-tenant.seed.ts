import { DataSource } from 'typeorm';
import { faker } from '@quickchat-bot/faker';
import { ITenant } from '@gauzy/contracts';
import { IntegrationTenant } from './integration-tenant.entity';
import { Organization } from './../core/entities/internal';

export const createRandomIntegrationTenant = async (
	dataSource: DataSource,
	tenants: ITenant[]
): Promise<IntegrationTenant[]> => {
	if (!tenants) {
		console.warn(
			'Warning: tenants not found, Integration Tenant  will not be created'
		);
		return;
	}
	const integrationTenants: IntegrationTenant[] = [];
	for (const tenant of tenants) {
		const { id: tenantId } = tenant;
		const organizations = await dataSource.manager.findBy(Organization, {
			tenantId
		});
		const integrationTenant = new IntegrationTenant();
		//todo:change name with some real values;
		integrationTenant.name = faker.company.companyName();
		integrationTenant.entitySettings = [];
		integrationTenant.tenant = tenant;
		integrationTenant.organization = faker.random.arrayElement(organizations);
		integrationTenants.push(integrationTenant);
	}
	await dataSource.manager.save(integrationTenants);
};
