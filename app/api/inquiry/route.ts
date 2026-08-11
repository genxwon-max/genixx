import { NextResponse } from "next/server";

type Payload = {
  name?: string;
  phone?: string;
  email?: string;
  org?: string;
  category?: string;
  message?: string;
  agree?: boolean;
};

const phoneRe = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 });
  }

  const errors: Record<string, string> = {};
  const name = body.name?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (name.length < 2) errors.name = "이름을 2자 이상 입력해주세요.";
  if (!phoneRe.test(phone)) errors.phone = "연락처 형식을 확인해주세요. (예: 010-1234-5678)";
  if (email && !emailRe.test(email)) errors.email = "이메일 형식을 확인해주세요.";
  if (message.length < 10) errors.message = "문의 내용을 10자 이상 입력해주세요.";
  if (!body.agree) errors.agree = "개인정보 수집 및 이용에 동의해주세요.";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  // 실제 서비스에서는 이 지점에서 DB 저장 또는 알림 발송을 연결합니다.
  const ticket = `GX-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  return NextResponse.json({
    ok: true,
    ticket,
    message: "문의가 정상적으로 접수되었습니다.",
  });
}
