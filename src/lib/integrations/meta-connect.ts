import "server-only";
import { fetchLeadForms, subscribePageToLeadgen, type MetaPage } from "@/lib/integrations/meta";
import { setSecret, SECRET } from "@/lib/integrations/secrets";
import { setIntegration } from "@/lib/integrations/store";

// Subscribes the Page to lead events, stores its access token in Vault
// (never in the integrations table), and starts listening to every lead
// form on it. The admin can narrow the forms down afterwards.
export async function finishMetaConnection(page: MetaPage) {
  await subscribePageToLeadgen(page.id, page.access_token);
  const forms = await fetchLeadForms(page.id, page.access_token);

  await setSecret(SECRET.metaPageToken, page.access_token);

  await setIntegration("meta", {
    status: "connected",
    config: {
      page_id: page.id,
      page_name: page.name,
      available_forms: forms,
      selected_form_ids: forms.map((f) => f.id),
    },
  });
}
