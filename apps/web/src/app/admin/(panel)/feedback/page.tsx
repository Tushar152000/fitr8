import Link from "next/link";
import type { AdminFeedbackPageDto } from "@fitr8/contracts";
import { Empty, formatWhen, PageHead, smallButton } from "@/components/admin/ui";
import { adminServerApi, requireStaff } from "@/lib/admin/server";

export const metadata = { title: "Feedback" };

const PLATFORM: Record<string, string> = { ios: "iPhone", android: "Android", web: "Web" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** In-app feedback (Help & support → "Send feedback"), newest first. Admins only. */
export default async function AdminFeedback({ searchParams }: PageProps<"/admin/feedback">) {
  const me = await requireStaff();
  if (!me.sections.feedback.read) {
    return (
      <>
        <PageHead title="Feedback" />
        <Empty>Only admins can read users&rsquo; feedback.</Empty>
      </>
    );
  }
  const page = Math.min(1000, Math.max(1, Number(one((await searchParams).page)) || 1));
  const data = await adminServerApi<AdminFeedbackPageDto>(`/feedback?page=${page}`);

  return (
    <>
      <PageHead
        title="Feedback"
        lead={`What people sent from the app’s Help & support screen · ${data.total} in total`}
      />
      {data.items.length === 0 ? (
        <Empty>No feedback yet.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((f) => (
            <li key={f.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
                {f.topic && (
                  <span className="inline-flex h-6 items-center rounded-full bg-chip px-2.5 text-[12px] font-bold text-ink-2">
                    {f.topic}
                  </span>
                )}
                <span className="font-semibold text-ink-2">
                  {f.user.name ?? "No name"}
                  {f.user.email && (
                    <>
                      {" · "}
                      <a href={`mailto:${f.user.email}`} className="hover:text-brand">
                        {f.user.email}
                      </a>
                    </>
                  )}
                </span>
                <span className="ml-auto">{formatWhen(f.createdAt)}</span>
              </div>
              <p className="mt-3 text-[15px] whitespace-pre-wrap text-ink">{f.message}</p>
              {(f.platform || f.appVersion) && (
                <p className="mt-3 text-[12px] font-semibold text-ink-3">
                  {[
                    f.platform && (PLATFORM[f.platform] ?? f.platform),
                    f.appVersion && `v${f.appVersion}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {data.pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-[14px]">
          {page > 1 && (
            <Link className={smallButton} href={`/admin/feedback?page=${page - 1}`}>
              Previous
            </Link>
          )}
          <span className="text-ink-3">
            Page {data.page} of {data.pages}
          </span>
          {page < data.pages && (
            <Link className={smallButton} href={`/admin/feedback?page=${page + 1}`}>
              Next
            </Link>
          )}
        </div>
      )}
    </>
  );
}
