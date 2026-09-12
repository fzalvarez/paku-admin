"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  is_active: boolean;
}

interface Product {
  id: string;
  category_id: string;
  name: string;
  is_active: boolean;
}

const ALL = "__all__";

interface ServicePickerProps {
  value: string; // service_id (product id) seleccionado; "" = ninguno
  onChange: (serviceId: string) => void;
  // Modo filtro: agrega "Todas las categorías" / "Todos los servicios".
  allowEmpty?: boolean;
  disabled?: boolean;
}

// Combobox categoría → producto para reemplazar el campo "Service ID (UUID)"
// de texto libre. El admin nunca ve/copia un UUID — ver
// doc_booking_disponibilidad_paku-admin.md sección 5.
export function ServicePicker({ value, onChange, allowEmpty = false, disabled }: ServicePickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<string>(allowEmpty ? ALL : "");
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setCategoriesLoading(true);
      try {
        const res = await apiFetch("/admin/store/categories");
        const data = res.ok ? await res.json() : [];
        setCategories(Array.isArray(data) ? data : []);
      } catch {
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!categoryId || categoryId === ALL) {
      setProducts([]);
      return;
    }
    (async () => {
      setProductsLoading(true);
      try {
        const res = await apiFetch(`/admin/store/products?category_id=${categoryId}`);
        const data = res.ok ? await res.json() : [];
        setProducts(Array.isArray(data) ? data : []);
      } catch {
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    })();
  }, [categoryId]);

  const handleCategoryChange = (v: string) => {
    setCategoryId(v);
    onChange("");
  };

  const handleProductChange = (v: string) => {
    onChange(v === ALL ? "" : v);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={categoryId} onValueChange={handleCategoryChange} disabled={disabled || categoriesLoading}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value={ALL}>Todas las categorías</SelectItem>}
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value || (allowEmpty ? ALL : "")}
        onValueChange={handleProductChange}
        disabled={disabled || !categoryId || categoryId === ALL || productsLoading}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder={productsLoading ? "Cargando…" : "Servicio"} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value={ALL}>Todos los servicios</SelectItem>}
          {products.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
