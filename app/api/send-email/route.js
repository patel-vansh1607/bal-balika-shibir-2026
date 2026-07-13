import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    // Parse the JSON body payload from the App Router request stream
    const body = await request.json();
    const { email, name, selectionStatus, templateType } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Missing core identity criteria parameters (email or name)' },
        { status: 400 }
      );
    }

    // 1. Acceptance Email Template HTML
    const getAcceptanceTemplate = (userName) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registration Approved</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #0f172a;-webkit-font-smoothing: antialiased;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background-color: #8a151b; padding: 32px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.02em;">Bal-Balika Shibir 2026</h1>
              <div style="color: #fecaca; font-size: 13px; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.05em; font-weight: 600;">Selection Acceptance Pass</div>
            </div>
            <div style="padding: 32px; line-height: 1.6; color: #334155;">
              <p style="font-size: 18px; font-weight: 700; margin-top: 0; color: #0f172a;">Jai Swaminarayan, ${userName}</p>
              <p>We are pleased to inform you that your registration profile tracking metrics matching the upcoming <strong>Bal-Balika Shibir Africa 2026</strong> event cycle have been officially approved.</p>
              
              <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <span style="font-size: 11px; color: #166534; font-weight: 700; display: block; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Current Status Matrix</span>
                <strong style="font-size: 15px; color: #14532d;">SELECTION CONFIRMED</strong>
              </div>
              
              <p>Kindly verify your specific travel profiles, regional delegation guidelines, and items checklist before the server database locks down permanently.</p>
              
              <div style="text-align: center; margin-top: 32px;">
                <a href="https://mtrc-2026.vercel.app" style="background-color: #8a151b; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 600; border-radius: 8px; display: inline-block;">Access Participant Portal</a>
              </div>
            </div>
            <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              This is an automated operational broadcast dispatched via secure production lines.<br>
              <strong>MTRC 2026 Management Operations Panel</strong>
            </div>
          </div>
        </body>
      </html>
    `;

    // 2. Rejection Email Template HTML
    const getRejectionTemplate = (userName) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registry Update</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 40px 20px; color: #1e293b;-webkit-font-smoothing: antialiased;">
          <div style="max-width: 560px; margin: 0 auto; border-top: 4px solid #64748b; padding-top: 32px;">
            <div style="font-size: 12px; font-weight: 700; color: #8a151b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">MTRC 2026 Registry Operations</div>
            <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; line-height: 1.3;">Registry Update Notification</h2>
            
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-top: 0;">Jai Swaminarayan, ${userName}</p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">Thank you for submitting your profile information for evaluation. Due to strict limits on site capacity for this regional assembly cycle, your record has been transitioned into the waitlisted pool tier.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 28px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              <tr>
                <td style="padding: 14px 16px; color: #64748b; font-size: 14px; font-weight: 500;">Operational Profile Allocation:</td>
                <td style="padding: 14px 16px; color: #991b1b; font-weight: 700; font-size: 14px; text-align: right;">WAITLISTED TIER</td>
              </tr>
            </table>
            
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">If any additional seats scale up or local team allocations clear, your coordinator metrics will be updated immediately.</p>
            
            <div style="margin-top: 40px; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 16px; line-height: 1.5;">
              Regards,<br>
              <strong>Communications Division Support</strong>
            </div>
          </div>
        </body>
      </html>
    `;

    // Process variables based on the template type flag sent from your React dashboard
    let htmlContent = '';
    let subjectLine = '';

    if (templateType === 'ACCEPTANCE_CARD') {
      subjectLine = '💥 Bal-Balika Shibir Africa 2026 - Registration Acceptance Confirmed!';
      htmlContent = getAcceptanceTemplate(name);
    } else {
      subjectLine = 'MTRC 2026 - Registration Tracking Profile Update';
      htmlContent = getRejectionTemplate(name);
    }

    // Execute the live Resend payload transmission
    const data = await resend.emails.send({
      from: 'MTRC 2026 Operations <notifications@mtrc-2026.vercel.app>',
      to: [email],
      subject: subjectLine,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API Error in send-email runtime router:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing template pipeline' },
      { status: 500 }
    );
  }
}