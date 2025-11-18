import { Product } from '@/types';

export class ProductBuilder {
  private product: Partial<Product> = {
    id: 'product-123',
    name: 'Test Snack',
    description: 'A delicious test snack',
    imageUrl: 'https://example.com/snack.jpg',
    slot: 11,
    price: 3500, // $35.00 in cents
    quantity: 10,
    vendingMachineId: 'machine_001',
    category: 'snacks',
    isActive: true,
    allergens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  withId(id: string): this {
    this.product.id = id;
    return this;
  }

  withName(name: string): this {
    this.product.name = name;
    return this;
  }

  withPrice(price: number): this {
    this.product.price = price;
    return this;
  }

  withQuantity(quantity: number): this {
    this.product.quantity = quantity;
    return this;
  }

  withSlot(slot: number): this {
    this.product.slot = slot;
    return this;
  }

  inactive(): this {
    this.product.isActive = false;
    return this;
  }

  outOfStock(): this {
    this.product.quantity = 0;
    return this;
  }

  lowStock(): this {
    this.product.quantity = 2; // Below threshold of 3
    return this;
  }

  withAllergens(allergens: string[]): this {
    this.product.allergens = allergens;
    return this;
  }

  build(): Product {
    return this.product as Product;
  }
}
