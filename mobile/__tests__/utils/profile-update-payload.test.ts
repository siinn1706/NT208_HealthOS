import { buildProfileUpdatePayload } from "@/utils/profile-update-payload";

describe("buildProfileUpdatePayload", () => {
  const emptyEc = {
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
  };

  it("maps blank phone, address, blood type to explicit null", () => {
    const r = buildProfileUpdatePayload({
      full_name: "N",
      phone: "   ",
      address: "",
      blood_type: "",
      ...emptyEc,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.phone).toBeNull();
    expect(r.payload.address).toBeNull();
    expect(r.payload.blood_type).toBeNull();
  });

  it("sends emergency_contacts null when all emergency fields blank", () => {
    const r = buildProfileUpdatePayload({
      full_name: "N",
      phone: "1",
      address: "a",
      blood_type: "A",
      ...emptyEc,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.emergency_contacts).toBeNull();
  });

  it("returns error when emergency block is partially filled", () => {
    const r = buildProfileUpdatePayload({
      full_name: "N",
      phone: "",
      address: "",
      blood_type: "",
      emergency_contact_name: "Mom",
      emergency_contact_phone: "",
      emergency_contact_relationship: "",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errorKey).toBe("profile.emergencyContactIncomplete");
  });

  it("sends one contact when name and phone present", () => {
    const r = buildProfileUpdatePayload({
      full_name: "N",
      phone: "",
      address: "",
      blood_type: "",
      emergency_contact_name: "Mom",
      emergency_contact_phone: "+15550001111",
      emergency_contact_relationship: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.emergency_contacts).toEqual([
      { name: "Mom", phone: "+15550001111", relationship: "Other" },
    ]);
  });
});
