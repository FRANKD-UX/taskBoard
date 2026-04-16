import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/site-users/web';
import { initializePnP } from '../../pnpjsConfig';

import TaskBoard from './components/TaskBoard';
import type { ITaskBoardProps } from './components/ITaskBoardProps';

export default class TaskBoardWebPart extends BaseClientSideWebPart<{}> {
  public onInit(): Promise<void> {
    initializePnP(this.context);

    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<ITaskBoardProps> = React.createElement(TaskBoard, {
      context: this.context
    });

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
