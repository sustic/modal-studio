import Link from "next/link";
import { NewOrgForm } from "./NewOrgForm";

export default function NewOrganisationPage() {
  return (
    <div className="flex flex-1 flex-col px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-[12px] text-white/35">
        <Link href="/admin/organisations" className="transition-colors hover:text-white/60">
          All Organisations
        </Link>
        <span>/</span>
        <span className="text-white/55">Create new</span>
      </div>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-[15px] font-semibold text-white">
          Create Organisation
        </h1>
        <p className="mt-1 text-[13px] text-white/60">
          Set up a new organisation and invite the first owner.
        </p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-xl">
        <NewOrgForm />
      </div>
    </div>
  );
}
