import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const { name, email, message } = await request.json();

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !message.trim() ||
    !EMAIL_REGEX.test(email.trim())
  ) {
    return Response.json(
      { ok: false, error: "Datos inválidos. Revisá nombre, email y mensaje." },
      { status: 400 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.CONTACT_EMAIL as string,
      subject: `Nuevo mensaje de contacto de ${name.trim()}`,
      text: `Nombre: ${name.trim()}\nEmail: ${email.trim()}\n\nMensaje:\n${message.trim()}`,
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { ok: false, error: "No se pudo enviar el mensaje. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
