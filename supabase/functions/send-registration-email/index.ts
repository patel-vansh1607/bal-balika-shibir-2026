// supabase/functions/send-registration-email/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('Missing RESEND_API_KEY configuration variable.')
    }

    const { email, name, memberId, region, center } = await req.json()

    if (!email || !name || !memberId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: email, name, or memberId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailPayload = {
      // 🔥 UPDATED: Swapped sandbox email with your live custom domain address
      from: 'Bal-Balika Shibir <registration@mtrc2026.site>', 
      to: [email],
      subject: `Registration Confirmed! Shibir ID: ${memberId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 0; background-color: #fcfbfa; -webkit-font-smoothing: antialiased;">
          
          <div style="background-color: #fcfbfa; width: 100%; padding: 40px 0;">
            
            <div style="font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e6dfd9; border-radius: 16px; color: #2d2926; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(138, 21, 27, 0.02);">
              
              <h2 style="font-size: 26px; font-weight: 700; color: #8a151b; text-align: center; border-bottom: 1px solid #e6dfd9; padding-bottom: 16px; margin-top: 0;">
                Making the Right Choices
              </h2>
              
              <p style="font-size: 20px; font-weight: 700; margin-top: 24px; color: #2d2926;">
                Jai Swaminarayan,
              </p>
              
              <p style="font-size: 16px; line-height: 1.6; color: #2d2926;">
                Thank you for registering <strong>${name}</strong> for the <strong>Bal-Balika Shibir Africa 2026 happening in ${region}</strong>. We are thrilled to confirm your submission.
              </p>
              
              <div style="background-color: #f4ece6; border: 1px solid #e6dfd9; padding: 20px; border-radius: 12px; margin: 24px 0;">
                <p style="margin: 8px 0; font-size: 15px; color: #6c635c;"><strong style="text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Attendee Name:</strong> <span style="font-weight: bold; color: #2d2926; margin-left: 5px;">${name}</span></p>
                <p style="margin: 8px 0; font-size: 15px; color: #6c635c;"><strong style="text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;"> Shibir ID:</strong> <span style="font-weight: bold; color: #8a151b; margin-left: 5px; font-size: 17px;">${memberId}</span></p>
                <p style="margin: 8px 0; font-size: 15px; color: #6c635c;"><strong style="text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;"> Country:</strong> <span style="font-weight: bold; color: #2d2926; margin-left: 5px;">${region}</span></p>
                <p style="margin: 8px 0; font-size: 15px; color: #6c635c;"><strong style="text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Center :</strong> <span style="font-weight: bold; color: #2d2926; margin-left: 5px;">${center}</span></p>
              </div>

              <hr style="border: 0; height: 1px; background: #e6dfd9; margin: 24px 0;" />
              
              <p style="font-size: 13px; color: #6c635c; text-align: center; line-height: 1.5; margin-bottom: 0;">
                This is an automated delivery channel confirmation dispatch. Please do not reply directly to this message tracking system.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    })

    const resendResult = await resendResponse.json()

    if (!resendResponse.ok) {
      throw new Error(`Resend processing pipeline failure: ${JSON.stringify(resendResult)}`)
    }

    return new Response(
      JSON.stringify({ success: true, messageId: resendResult.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})