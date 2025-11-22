import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Package, X, Plus, Minus, ArrowRight } from 'lucide-react';
import { collection, doc, onSnapshot, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { Product, Session, BasketItem } from '@/types';
import SessionTimer from '@/components/SessionTimer';
import { ProductGridSkeleton } from '@/components/SkeletonLoader';
import toast from 'react-hot-toast';
import Lottie from 'lottie-react';
import shoppingAnimation from '@/assets/animations/shopping.json';
import { staggerContainer, staggerItem, fadeInUp, slideInRight, scaleIn, pageTransition } from '@/lib/animations';

export default function ShoppingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Listen to session changes
    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubscribe = onSnapshot(
      sessionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setSession({
            id: snapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            expiresAt: data.expiresAt?.toDate(),
            completedAt: data.completedAt?.toDate(),
          } as Session);

          // Check if session has been paid
          if (data.status === 'completed' || data.payments?.some((p: any) => p.status === 'completed')) {
            navigate(`/dispensing/${sessionId}`);
          }
        } else {
          toast.error('Session not found');
        }
      },
      (error) => {
        console.error('Session listener error:', error);
        toast.error('Failed to load session');
      }
    );

    return () => unsubscribe();
  }, [sessionId, navigate]);

  useEffect(() => {
    // Load products
    const loadProducts = async () => {
      try {
        const q = query(
          collection(db, 'inventory'),
          where('isActive', '==', true),
          where('quantity', '>', 0)
        );
        const snapshot = await getDocs(q);
        const productsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })) as Product[];
        setProducts(productsData);
      } catch (error) {
        console.error('Failed to load products:', error);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const addToBasket = async (product: Product, quantity: number = 1) => {
    if (!sessionId || !session) return;

    try {
      const existingItem = session.basket.find((item) => item.productId === product.id);
      let newBasket: BasketItem[];

      if (existingItem) {
        newBasket = session.basket.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        newBasket = [
          ...session.basket,
          {
            productId: product.id,
            productName: product.name,
            quantity,
            price: product.price,
            slot: product.slot,
          },
        ];
      }

      const totalAmount = newBasket.reduce((sum, item) => sum + item.price * item.quantity, 0);

      await updateDoc(doc(db, 'sessions', sessionId), {
        basket: newBasket,
        totalAmount,
      });

      toast.success(`${product.name} added to cart`);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Failed to add to basket:', error);
      toast.error('Failed to add item');
    }
  };

  const updateQuantity = async (productId: string, delta: number) => {
    if (!sessionId || !session) return;

    try {
      const newBasket = session.basket
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0);

      const totalAmount = newBasket.reduce((sum, item) => sum + item.price * item.quantity, 0);

      await updateDoc(doc(db, 'sessions', sessionId), {
        basket: newBasket,
        totalAmount,
      });
    } catch (error) {
      console.error('Failed to update quantity:', error);
      toast.error('Failed to update cart');
    }
  };

  const handleExtendSession = async () => {
    if (!sessionId) return;

    try {
      const functions = getFunctions();
      const extendSession = httpsCallable(functions, 'extendSession');
      const result = await extendSession({ sessionId });

      toast.success('Session extended successfully!');
    } catch (error: any) {
      console.error('Failed to extend session:', error);
      if (error.code === 'failed-precondition') {
        toast.error(error.message || 'Session cannot be extended');
      } else {
        toast.error('Failed to extend session');
      }
    }
  };

  const cartItemCount = session?.basket.reduce((sum, item) => sum + item.quantity, 0) || 0;

  if (loading) {
    return (
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="min-h-screen pb-24"
      >
        <div className="glass-strong sticky top-0 z-40 p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Second Space</h1>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-4 mt-6">
          <ProductGridSkeleton />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen pb-24"
    >
      {/* Session Timer */}
      {session && session.status === 'active' && (
        <SessionTimer
          expiresAt={session.expiresAt}
          sessionId={sessionId!}
          extendedCount={session.extendedCount || 0}
          onExtend={handleExtendSession}
        />
      )}

      {/* Header */}
      <div className="glass-strong sticky top-0 z-40 p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Second Space</h1>
            <p className="text-sm text-gray-600">Choose your treats</p>
          </div>
          <motion.button
            onClick={() => setCartOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-3 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <ShoppingCart className="w-6 h-6" />
            <AnimatePresence>
              {cartItemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
                >
                  {cartItemCount}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto p-4 mt-6">
        {products.length === 0 ? (
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            className="flex flex-col items-center justify-center py-16 px-4"
          >
            <div className="glass-strong rounded-3xl p-12 text-center max-w-md">
              <Package className="w-24 h-24 text-gray-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Products Available</h3>
              <p className="text-gray-600">
                There are currently no products in the vending machine. Please check back later!
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                variants={staggerItem}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="glass-strong rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="aspect-square bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center p-8">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/300?text=Product';
                      }}
                    />
                  ) : (
                    <Package className="w-24 h-24 text-primary-400" />
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary-600">
                      ${(product.price / 100).toFixed(2)}
                    </span>
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToBasket(product);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-strong rounded-3xl max-w-lg w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-square bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center p-12">
                {selectedProduct.imageUrl ? (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/400?text=Product';
                    }}
                  />
                ) : (
                  <Package className="w-32 h-32 text-primary-400" />
                )}
              </div>
              <div className="p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{selectedProduct.name}</h2>
                <p className="text-gray-600 mb-6">{selectedProduct.description}</p>

                {selectedProduct.allergens && selectedProduct.allergens.length > 0 && (
                  <div className="mb-6">
                    <p className="font-semibold text-gray-900 mb-2">Allergens:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.allergens.map((allergen) => (
                        <span key={allergen} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t">
                  <span className="text-3xl font-bold text-primary-600">
                    ${(selectedProduct.price / 100).toFixed(2)}
                  </span>
                  <motion.button
                    onClick={() => addToBasket(selectedProduct)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-3 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add to Cart
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setCartOpen(false)}
            />
            <motion.div
              variants={slideInRight}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass-strong shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Your Cart</h2>
                <motion.button
                  onClick={() => setCartOpen(false)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!session || session.basket.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Your cart is empty</p>
                  </div>
                ) : (
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="space-y-4"
                  >
                    {session.basket.map((item, index) => (
                      <motion.div
                        key={item.productId}
                        variants={staggerItem}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 hover:bg-white/70 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{item.productName}</h3>
                          <p className="text-primary-600 font-medium">
                            ${(item.price / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={() => updateQuantity(item.productId, -1)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </motion.button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <motion.button
                            onClick={() => updateQuantity(item.productId, 1)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {session && session.basket.length > 0 && (
                <div className="p-6 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-primary-600">
                      ${(session.totalAmount / 100).toFixed(2)}
                    </span>
                  </div>
                  <motion.button
                    onClick={() => {
                      setCartOpen(false);
                      navigate(`/checkout/${sessionId}`);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
