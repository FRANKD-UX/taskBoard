import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";

const DATA_SITE = "https://skyfi.sharepoint.com/sites/Helpdesk";

let _sp: ReturnType<typeof spfi> | null = null;

/**
 * Initialize the singleton SPFI instance bound to the Helpdesk site.
 * Must be called once before any data operations.
 */
export const initSP = (context: any): void => {
    if (!_sp) {
        _sp = spfi(DATA_SITE).using(SPFx(context));
        console.log("SP initialized for site:", DATA_SITE);
    }
};

/**
 * Returns the initialized SPFI instance.
 * Throws if initSP has not been called.
 */
export const getSP = (): ReturnType<typeof spfi> => {
    if (!_sp) {
        throw new Error("SP not initialized. Call initSP(context) first.");
    }
    return _sp;
};

/**
 * The data site URL. Exported for components that need to construct
 * absolute URLs (e.g., PeoplePicker, CollaboratorService).
 */
export { DATA_SITE };