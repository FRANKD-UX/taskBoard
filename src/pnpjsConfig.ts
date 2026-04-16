import type { WebPartContext } from '@microsoft/sp-webpart-base';
import { SPFI, spfi } from '@pnp/sp';
import { SPFx } from '@pnp/sp/behaviors/spfx';

let spInstance: SPFI = spfi();

export const initializePnP = (context: WebPartContext): void => {
  spInstance = spfi().using(SPFx(context));
};

export const getSP = (): SPFI => {
  return spInstance;
};
