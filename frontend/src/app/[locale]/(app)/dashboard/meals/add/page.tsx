import { AddMealForm } from "@/components/dashboard/meals/AddMealForm";

export default function AddMealPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Thêm bữa ăn</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Nhập tên món ăn và thành phần để tính toán dinh dưỡng
        </p>
      </div>

      <AddMealForm />
    </div>
  );
}
