import { IBasePerTenantAndOrganizationEntityModel } from "./base-entity.model";
import { IOrganizationProject } from "./organization-projects.model";

export interface IStatus extends IBasePerTenantAndOrganizationEntityModel {
    name: string;
    value: string;
    description?: string;
    icon?: string;
    color?: string;
	isSystem?: boolean;
    project?:  IOrganizationProject;
    projectId?:  IOrganizationProject['id'];
}