"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { pickLocale } from "@/types";
import type { TeamMember, Locale } from "@/types";

interface TeamMemberCardProps {
  member: TeamMember;
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
  const locale = useLocale() as Locale;
  const role = pickLocale(member.role, locale);

  return (
    <div className="group text-center">
      <div className="relative mx-auto mb-3 size-28 overflow-hidden rounded-2xl">
        <Image
          src={member.image}
          alt={member.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          sizes="112px"
        />
      </div>
      <h4 className="text-sm font-semibold text-foreground">{member.name}</h4>
      <p className="text-xs text-muted-foreground">{role}</p>
    </div>
  );
}
