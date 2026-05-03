// NotificationService.ts
import { AadHttpClient } from '@microsoft/sp-http';
import type { WebPartContext } from '@microsoft/sp-webpart-base';

export class NotificationService {
	private context: WebPartContext;

	constructor(context: WebPartContext) {
		this.context = context;
	}

	/**
	 * Sends an email via Microsoft Graph.
	 * Requires Mail.Send permission (delegated or application).
	 */
	public async sendEmail(
		toRecipients: string[],
		subject: string,
		bodyHtml: string,
		ccRecipients?: string[]
	): Promise<void> {
		const client = await this.context.aadHttpClientFactory.getClient(
			'https://graph.microsoft.com'
		);

		const message = {
			message: {
				subject,
				body: {
					contentType: 'HTML',
					content: bodyHtml,
				},
				toRecipients: toRecipients.map(email => ({
					emailAddress: { address: email },
				})),
				ccRecipients: ccRecipients?.map(email => ({
					emailAddress: { address: email },
				})) ?? [],
			},
			saveToSentItems: 'false',
		};

		await client.post(
			'https://graph.microsoft.com/v1.0/me/sendMail',
			AadHttpClient.configurations.v1,
			{
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(message),
			}
		);
	}

	/**
	 * Sends a notification for an SLA escalation event.
	 */
	public async sendEscalationNotification(params: {
		escalatedToEmail: string;
		escalatedToName: string;
		managerEmail?: string;
		incidentTitle: string;
		incidentId: string;
		department: string;
		oldAssignee: string;
	}): Promise<void> {
		const subject = `🚨 SLA Breached: ${params.incidentTitle} (ID ${params.incidentId})`;

		const body = `
            <h3>Incident Escalation</h3>
            <p><strong>Incident:</strong> ${params.incidentTitle}</p>
            <p><strong>Department:</strong> ${params.department}</p>
            <p><strong>Previous Assignee:</strong> ${params.oldAssignee}</p>
            <p><strong>Escalated To:</strong> ${params.escalatedToName}</p>
            <p>This incident has breached its SLA and has been re‑assigned to you for immediate action.</p>
            <p><a href="https://skyfi.sharepoint.com/sites/Helpdesk/Lists/WorkItems/DispForm.aspx?ID=${params.incidentId}">View Incident</a></p>
        `;

		await this.sendEmail(
			[params.escalatedToEmail],
			subject,
			body,
			params.managerEmail ? [params.managerEmail] : []
		);
	}
} 