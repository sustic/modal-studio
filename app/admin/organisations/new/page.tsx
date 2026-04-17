import { PageHeader } from "@/app/components/PageHeader";
import { NewOrgForm } from "./NewOrgForm";

export default function NewOrganisationPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Organisations", href: "/admin/organisations" },
          { label: "Create new" },
        ]}
      />
      <div className="flex flex-1 flex-col px-8 py-8">
        {/* Form card */}
        <div className="w-full max-w-xl">
          <NewOrgForm />
        </div>
      </div>
    </>
  );
}
