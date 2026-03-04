"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ContactForm() {
  const t = useTranslations("form");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(t("success"));
    setFormData({ fullName: "", email: "", phone: "", message: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder={t("name")}
        value={formData.fullName}
        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        className="border-border bg-card"
        required
      />
      <Input
        type="email"
        placeholder={t("email")}
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        className="border-border bg-card"
        required
      />
      <Input
        type="tel"
        placeholder={t("phone")}
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        className="border-border bg-card"
      />
      <textarea
        placeholder={t("message")}
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-none"
        required
      />
      <Button
        type="submit"
        className="rounded-full bg-gradient-to-r from-night-700 via-night-600 to-night-400 px-8 text-white shadow-md shadow-night-400/20 transition-[filter,box-shadow] duration-150 ease-out hover:brightness-110 hover:shadow-night-400/40"
      >
        {t("submit")} <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </form>
  );
}
