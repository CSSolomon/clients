import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { Permissions } from "@bitwarden/common/enums/permissions";

import { EventsComponent } from "../../../organizations//manage/events.component";
import { PermissionsGuard } from "../../../organizations/guards/permissions.guard";
import { NavigationPermissionsService } from "../../../organizations/services/navigation-permissions.service";
import { ExposedPasswordsReportComponent } from "../../../organizations/tools/exposed-passwords-report.component";
import { InactiveTwoFactorReportComponent } from "../../../organizations/tools/inactive-two-factor-report.component";
import { ReusedPasswordsReportComponent } from "../../../organizations/tools/reused-passwords-report.component";
import { UnsecuredWebsitesReportComponent } from "../../../organizations/tools/unsecured-websites-report.component";
import { WeakPasswordsReportComponent } from "../../../organizations/tools/weak-passwords-report.component";

import { ReportListComponent } from "./report-list.component";
import { ReportingComponent } from "./reporting.component";

const routes: Routes = [
  {
    path: "",
    component: ReportingComponent,
    canActivate: [PermissionsGuard],
    data: { permissions: NavigationPermissionsService.getPermissions("reporting") },
    children: [
      { path: "", pathMatch: "full", redirectTo: "reports" },
      {
        path: "reports",
        component: ReportListComponent,
        canActivate: [PermissionsGuard],
        data: {
          titleId: "reports",
          permissions: [Permissions.AccessReports],
        },
        children: [
          {
            path: "exposed-passwords-report",
            component: ExposedPasswordsReportComponent,
            canActivate: [PermissionsGuard],
            data: {
              titleId: "exposedPasswordsReport",
              permissions: [Permissions.AccessReports],
            },
          },
          {
            path: "inactive-two-factor-report",
            component: InactiveTwoFactorReportComponent,
            canActivate: [PermissionsGuard],
            data: {
              titleId: "inactive2faReport",
              permissions: [Permissions.AccessReports],
            },
          },
          {
            path: "reused-passwords-report",
            component: ReusedPasswordsReportComponent,
            canActivate: [PermissionsGuard],
            data: {
              titleId: "reusedPasswordsReport",
              permissions: [Permissions.AccessReports],
            },
          },
          {
            path: "unsecured-websites-report",
            component: UnsecuredWebsitesReportComponent,
            canActivate: [PermissionsGuard],
            data: {
              titleId: "unsecuredWebsitesReport",
              permissions: [Permissions.AccessReports],
            },
          },
          {
            path: "weak-passwords-report",
            component: WeakPasswordsReportComponent,
            canActivate: [PermissionsGuard],
            data: {
              titleId: "weakPasswordsReport",
              permissions: [Permissions.AccessReports],
            },
          },
        ],
      },
      {
        path: "events",
        component: EventsComponent,
        canActivate: [PermissionsGuard],
        data: {
          titleId: "eventLogs",
          permissions: [Permissions.AccessEventLogs],
        },
      },
    ],
  },
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrganizationReportingRoutingModule {}
