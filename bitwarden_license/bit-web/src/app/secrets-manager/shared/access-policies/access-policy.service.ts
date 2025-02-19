import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { CryptoService } from "@bitwarden/common/abstractions/crypto.service";
import { EncryptService } from "@bitwarden/common/abstractions/encrypt.service";
import { EncString } from "@bitwarden/common/models/domain/enc-string";
import { SymmetricCryptoKey } from "@bitwarden/common/models/domain/symmetric-crypto-key";
import { ListResponse } from "@bitwarden/common/models/response/list.response";

import {
  BaseAccessPolicyView,
  GroupProjectAccessPolicyView,
  ServiceAccountProjectAccessPolicyView,
  UserProjectAccessPolicyView,
} from "../../models/view/access-policy.view";
import { PotentialGranteeView } from "../../models/view/potential-grantee.view";
import { ProjectAccessPoliciesView } from "../../models/view/project-access-policies.view";

import { AccessPoliciesCreateRequest } from "./models/requests/access-policies-create.request";
import { AccessPolicyUpdateRequest } from "./models/requests/access-policy-update.request";
import { AccessPolicyRequest } from "./models/requests/access-policy.request";
import {
  GroupProjectAccessPolicyResponse,
  ServiceAccountProjectAccessPolicyResponse,
  UserProjectAccessPolicyResponse,
} from "./models/responses/access-policy.response";
import { PotentialGranteeResponse } from "./models/responses/potential-grantee.response";
import { ProjectAccessPoliciesResponse } from "./models/responses/project-access-policies.response";

@Injectable({
  providedIn: "root",
})
export class AccessPolicyService {
  protected _projectAccessPolicies = new Subject<ProjectAccessPoliciesView>();
  projectAccessPolicies$ = this._projectAccessPolicies.asObservable();

  constructor(
    private cryptoService: CryptoService,
    private apiService: ApiService,
    private encryptService: EncryptService
  ) {}

  async getProjectAccessPolicies(
    organizationId: string,
    projectId: string
  ): Promise<ProjectAccessPoliciesView> {
    const r = await this.apiService.send(
      "GET",
      "/projects/" + projectId + "/access-policies",
      null,
      true,
      true
    );

    const results = new ProjectAccessPoliciesResponse(r);
    return await this.createProjectAccessPoliciesView(organizationId, results);
  }

  async getPeoplePotentialGrantees(organizationId: string) {
    const r = await this.apiService.send(
      "GET",
      "/organizations/" + organizationId + "/access-policies/people/potential-grantees",
      null,
      true,
      true
    );
    const results = new ListResponse(r, PotentialGranteeResponse);
    return await this.createPotentialGranteeViews(organizationId, results.data);
  }

  async getServiceAccountsPotentialGrantees(organizationId: string) {
    const r = await this.apiService.send(
      "GET",
      "/organizations/" + organizationId + "/access-policies/service-accounts/potential-grantees",
      null,
      true,
      true
    );
    const results = new ListResponse(r, PotentialGranteeResponse);
    return await this.createPotentialGranteeViews(organizationId, results.data);
  }

  async deleteAccessPolicy(accessPolicyId: string): Promise<void> {
    await this.apiService.send("DELETE", "/access-policies/" + accessPolicyId, null, true, false);
    this._projectAccessPolicies.next(null);
  }

  async updateAccessPolicy(baseAccessPolicyView: BaseAccessPolicyView): Promise<void> {
    const payload = new AccessPolicyUpdateRequest();
    payload.read = baseAccessPolicyView.read;
    payload.write = baseAccessPolicyView.write;
    await this.apiService.send(
      "PUT",
      "/access-policies/" + baseAccessPolicyView.id,
      payload,
      true,
      true
    );
  }

  async createProjectAccessPolicies(
    organizationId: string,
    projectId: string,
    projectAccessPoliciesView: ProjectAccessPoliciesView
  ): Promise<ProjectAccessPoliciesView> {
    const request = this.getAccessPoliciesCreateRequest(projectAccessPoliciesView);
    const r = await this.apiService.send(
      "POST",
      "/projects/" + projectId + "/access-policies",
      request,
      true,
      true
    );
    const results = new ProjectAccessPoliciesResponse(r);
    const view = await this.createProjectAccessPoliciesView(organizationId, results);
    this._projectAccessPolicies.next(view);
    return view;
  }

  private async getOrganizationKey(organizationId: string): Promise<SymmetricCryptoKey> {
    return await this.cryptoService.getOrgKey(organizationId);
  }

  private getAccessPoliciesCreateRequest(
    projectAccessPoliciesView: ProjectAccessPoliciesView
  ): AccessPoliciesCreateRequest {
    const createRequest = new AccessPoliciesCreateRequest();

    if (projectAccessPoliciesView.userAccessPolicies?.length > 0) {
      createRequest.userAccessPolicyRequests = projectAccessPoliciesView.userAccessPolicies.map(
        (ap) => {
          return this.getAccessPolicyRequest(ap.organizationUserId, ap);
        }
      );
    }

    if (projectAccessPoliciesView.groupAccessPolicies?.length > 0) {
      createRequest.groupAccessPolicyRequests = projectAccessPoliciesView.groupAccessPolicies.map(
        (ap) => {
          return this.getAccessPolicyRequest(ap.groupId, ap);
        }
      );
    }

    if (projectAccessPoliciesView.serviceAccountAccessPolicies?.length > 0) {
      createRequest.serviceAccountAccessPolicyRequests =
        projectAccessPoliciesView.serviceAccountAccessPolicies.map((ap) => {
          return this.getAccessPolicyRequest(ap.serviceAccountId, ap);
        });
    }
    return createRequest;
  }

  private getAccessPolicyRequest(
    granteeId: string,
    view:
      | UserProjectAccessPolicyView
      | GroupProjectAccessPolicyView
      | ServiceAccountProjectAccessPolicyView
  ) {
    const request = new AccessPolicyRequest();
    request.granteeId = granteeId;
    request.read = view.read;
    request.write = view.write;
    return request;
  }

  private async createProjectAccessPoliciesView(
    organizationId: string,
    projectAccessPoliciesResponse: ProjectAccessPoliciesResponse
  ): Promise<ProjectAccessPoliciesView> {
    const orgKey = await this.getOrganizationKey(organizationId);
    const view = new ProjectAccessPoliciesView();

    view.userAccessPolicies = projectAccessPoliciesResponse.userAccessPolicies.map((ap) => {
      return this.createUserProjectAccessPolicyView(ap);
    });
    view.groupAccessPolicies = projectAccessPoliciesResponse.groupAccessPolicies.map((ap) => {
      return this.createGroupProjectAccessPolicyView(ap);
    });
    view.serviceAccountAccessPolicies = await Promise.all(
      projectAccessPoliciesResponse.serviceAccountAccessPolicies.map(async (ap) => {
        return await this.createServiceAccountProjectAccessPolicyView(orgKey, ap);
      })
    );
    return view;
  }

  private createUserProjectAccessPolicyView(
    response: UserProjectAccessPolicyResponse
  ): UserProjectAccessPolicyView {
    const view = <UserProjectAccessPolicyView>this.createBaseAccessPolicyView(response);
    view.grantedProjectId = response.grantedProjectId;
    view.organizationUserId = response.organizationUserId;
    view.organizationUserName = response.organizationUserName;
    return view;
  }

  private createGroupProjectAccessPolicyView(
    response: GroupProjectAccessPolicyResponse
  ): GroupProjectAccessPolicyView {
    const view = <GroupProjectAccessPolicyView>this.createBaseAccessPolicyView(response);
    view.grantedProjectId = response.grantedProjectId;
    view.groupId = response.groupId;
    view.groupName = response.groupName;
    return view;
  }

  private async createServiceAccountProjectAccessPolicyView(
    organizationKey: SymmetricCryptoKey,
    response: ServiceAccountProjectAccessPolicyResponse
  ): Promise<ServiceAccountProjectAccessPolicyView> {
    const view = <ServiceAccountProjectAccessPolicyView>this.createBaseAccessPolicyView(response);
    view.grantedProjectId = response.grantedProjectId;
    view.serviceAccountId = response.serviceAccountId;
    view.serviceAccountName = await this.encryptService.decryptToUtf8(
      new EncString(response.serviceAccountName),
      organizationKey
    );
    return view;
  }

  private createBaseAccessPolicyView(
    response:
      | UserProjectAccessPolicyResponse
      | GroupProjectAccessPolicyResponse
      | ServiceAccountProjectAccessPolicyResponse
  ) {
    return {
      id: response.id,
      read: response.read,
      write: response.write,
      creationDate: response.creationDate,
      revisionDate: response.revisionDate,
    };
  }

  private async createPotentialGranteeViews(
    organizationId: string,
    results: PotentialGranteeResponse[]
  ): Promise<PotentialGranteeView[]> {
    const orgKey = await this.getOrganizationKey(organizationId);
    return await Promise.all(
      results.map(async (r) => {
        const view = new PotentialGranteeView();
        view.id = r.id;
        view.type = r.type;
        view.email = r.email;

        if (r.type === "serviceAccount") {
          view.name = await this.encryptService.decryptToUtf8(new EncString(r.name), orgKey);
        } else {
          view.name = r.name;
        }
        return view;
      })
    );
  }
}
