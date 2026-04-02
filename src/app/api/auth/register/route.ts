import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request){
  const { email, password, name} = await req.json() as { email: string; password: string; name: string };
  if(!email||!password||!name) {
    return NextResponse.json(
      {error: "Email and password are required"},
      {status: 400}
    );
  }
  if(password.length < 8){
    return NextResponse.json(
      {error: "Password must be at least 8 characters long"},
      {status: 400}
    );
  }
  const existingUser = await prisma.user.findUnique({
    where: {email},
  });
  if(existingUser){
    return NextResponse.json(
      {error: "User already exists"},
      {status: 400}
    );
  }
  const passwordHash = await bcrypt.hash(password,12);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
    },
  });
  return NextResponse.json({message: "User created successfully"}, {status: 201});
}