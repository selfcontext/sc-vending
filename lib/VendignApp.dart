import 'dart:math';
import 'package:flutter/material.dart';

import 'Globals.dart' show vendingInstance;

// ──────────────────────────────────────────────────────────
//  MODEL
// ──────────────────────────────────────────────────────────
class Product {
  final String name;
  final int slotNo; // Machine slot
  final int price; // NT$ in whole dollars
  final Color color; // Accent for card
  const Product(this.name, this.slotNo, this.price, this.color);
}

/// Hard-coded catalogue; in production you’d fetch from backend/Firestore.
const _catalogue = <Product>[
  Product('Cola', 11, 35, Color(0xffc2185b)),
  Product('Water', 12, 25, Color(0xff03a9f4)),
  Product('Chips', 21, 40, Color(0xffffc107)),
  Product('Candy', 22, 30, Color(0xff7c4dff)),
  Product('Coffee', 31, 45, Color(0xff6d4c41)),
];

class CartEntry {
  final Product product;
  int qty;
  CartEntry(this.product, this.qty);
}

// ──────────────────────────────────────────────────────────
//  APP
// ──────────────────────────────────────────────────────────

class VendingApp extends StatefulWidget {
  const VendingApp({super.key});
  @override
  State<VendingApp> createState() => _VendingAppState();
}

class _VendingAppState extends State<VendingApp> {
  final Map<int, CartEntry> _cart = {};
  final _random = Random();

  @override
  void initState() {
    super.initState();
    vendingInstance.initializeSdk(); // stub prints in console
  }

  /// Adds chosen item to the in-memory cart.
  void _add(Product p) {
    setState(() {
      _cart.putIfAbsent(p.slotNo, () => CartEntry(p, 0)).qty++;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${p.name} added ✔︎'),
        duration: const Duration(milliseconds: 700),
      ),
    );
  }

  /// Opens a modal bottom sheet that shows cart + checkout button.
  void _openCart() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surfaceVariant.withOpacity(.95),
      isScrollControlled: true,
      builder: (_) => CartSheet(
        entries: _cart.values.toList(),
        onRemove: (entry) {
          setState(() {
            if (entry.qty > 1) {
              entry.qty--;
            } else {
              _cart.remove(entry.product.slotNo);
            }
          });
        },
        onCheckout: _checkout,
      ),
    );
  }

  /// Mimic payment + ship via stub, clear cart afterward.
  Future<void> _checkout() async {
    if (_cart.isEmpty) return;
    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Dialog(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(width: 20),
              Text('Processing...'),
            ],
          ),
        ),
      ),
    );
    final tradeNo = DateTime.now().millisecondsSinceEpoch.toString();
    for (final e in _cart.values) {
      for (var i = 0; i < e.qty; i++) {
        await vendingInstance.ship(
          slotNo: e.product.slotNo,
          shipMethod: 0,
          amount: e.product.price,
          tradeNo: '${tradeNo}_${_random.nextInt(1 << 16)}',
        );
      }
    }
    if (mounted) {
      Navigator.pop(context); // close loading dialog
      Navigator.pop(context); // close sheet
      setState(() => _cart.clear());
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vending… check the machine!')),
      );
    }
  }

  // ───────────────── UI: PRODUCT GRID ─────────────────
  @override
  Widget build(BuildContext context) {
    final cartCount = _cart.values.fold<int>(0, (s, e) => s + e.qty);
    final screenWidth = MediaQuery.of(context).size.width;
    final crossAxisCount = (screenWidth / 180).floor().clamp(1, 4); // Responsive column count
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pick your treat'),
        actions: [
          if (cartCount > 0)
            Padding(
              padding: const EdgeInsets.only(right: 16, top: 8),
              child: Stack(
                alignment: Alignment.topRight,
                children: [
                  IconButton(
                    icon: const Icon(Icons.shopping_cart_outlined),
                    onPressed: _openCart,
                  ),
                  CircleAvatar(
                    radius: 10,
                    backgroundColor: Theme.of(context).colorScheme.error,
                    child: Text(
                      '$cartCount',
                      style: const TextStyle(fontSize: 11, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
      body: GridView.builder(
        padding: const EdgeInsets.all(12),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: crossAxisCount,
          childAspectRatio: 0.8,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: _catalogue.length,
        itemBuilder: (_, i) => ProductCard(product: _catalogue[i], onTap: _add),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCart,
        icon: const Icon(Icons.shopping_cart_checkout),
        label: const Text('Cart'),
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────
//  WIDGETS
// ──────────────────────────────────────────────────────────
class ProductCard extends StatelessWidget {
  final Product product;
  final ValueChanged<Product> onTap;
  const ProductCard({super.key, required this.product, required this.onTap});

  @override
  Widget build(BuildContext context) {
    // Assign specific icons based on product name
    IconData icon;
    switch (product.name) {
      case 'Cola':
      case 'Water':
        icon = Icons.local_drink;
        break;
      case 'Chips':
        icon = Icons.fastfood;
        break;
      case 'Candy':
        icon = Icons.cookie;
        break;
      case 'Coffee':
        icon = Icons.local_cafe;
        break;
      default:
        icon = Icons.fastfood;
    }
    return InkWell(
      borderRadius: BorderRadius.circular(24),
      onTap: () => onTap(product),
      child: Ink(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            colors: [product.color.withOpacity(.8), product.color.withOpacity(.4)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: product.color.withOpacity(.4),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Expanded(
                child: Icon(
                  icon,
                  size: 72,
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),
              Text(
                product.name,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium!
                    .copyWith(fontWeight: FontWeight.w600),
              ),
              Text(
                '\$${product.price}',
                style: Theme.of(context)
                    .textTheme
                    .labelLarge!
                    .copyWith(letterSpacing: 0.5),
              ),
              const SizedBox(height: 4),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white.withOpacity(.85),
                ),
                onPressed: () => onTap(product),
                child: const Text('Add'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class CartSheet extends StatelessWidget {
  final List<CartEntry> entries;
  final ValueChanged<CartEntry> onRemove;
  final VoidCallback onCheckout;

  const CartSheet({
    super.key,
    required this.entries,
    required this.onRemove,
    required this.onCheckout,
  });

  int get _total => entries.fold(0, (s, e) => s + e.product.price * e.qty);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Handle empty cart case
    if (entries.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.shopping_cart,
              size: 64,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'Your cart is empty',
              style: const TextStyle(fontSize: 18),
            ),
          ],
        ),
      );
    }
    return DraggableScrollableSheet(
      expand: false,
      maxChildSize: .9,
      initialChildSize: .6,
      builder: (_, ctl) => Column(
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: theme.colorScheme.onSurfaceVariant,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Expanded(
            child: ListView.separated(
              controller: ctl,
              itemCount: entries.length,
              separatorBuilder: (_, __) => const Divider(height: 0),
              itemBuilder: (_, i) {
                final e = entries[i];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: e.product.color,
                    child: Text('${e.qty}'),
                  ),
                  title: Text(e.product.name),
                  subtitle: Text('\$${e.product.price}  ×  ${e.qty}'),
                  trailing: IconButton(
                    icon: const Icon(Icons.remove_circle_outline),
                    onPressed: () => onRemove(e),
                  ),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Total',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '\$$_total',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.credit_card),
                    label: const Text('Checkout & Vend'),
                    onPressed: onCheckout,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: theme.colorScheme.primary,
                      foregroundColor: theme.colorScheme.onPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}