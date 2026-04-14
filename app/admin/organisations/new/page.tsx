import Link from "next/link";
import { PageHeader } from "@/app/components/PageHeader";
import { NewOrgForm } from "./NewOrgForm";

export default function NewOrganisationPage() {
  return (
    <>
      <PageHeader title="Create Organisation" />
      <div className="flex flex-1 flex-col px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-[12px] text-muted-foreground/50">
          <Link href="/admin/organisations" className="transition-colors hover:text-muted-foreground">
            All Organisations
          </Link>
          <span>/</span>
          <span className="text-muted-foreground/70">Create new</span>
        </div>

        {/* Form card */}
        <div className="w-full max-w-xl">
          <NewOrgForm />
        </div>
      </div>
    </>
  );
}
