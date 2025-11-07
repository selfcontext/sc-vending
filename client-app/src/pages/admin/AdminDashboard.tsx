import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  LogOut,
  Activity,
  DollarSign,
  ShoppingBag,
  Loader,
  X,
  Save,
} from 'lucide-react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Product, Session } from '@/types';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, signOut } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'sessions'>('products');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin/login');
      return;
    }

    // Listen to products
    const productsQuery = query(collection(db, 'inventory'), orderBy('name'));
    const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
      const productsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Product[];
      setProducts(productsData);
      setLoading(false);
    });

    // Listen to recent sessions
    const sessionsQuery = query(
      collection(db, 'sessions'),
      orderBy('createdAt', 'desc')
    );
    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
      const sessionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate(),
      })) as Session[];
      setSessions(sessionsData.slice(0, 10)); // Last 10 sessions
    });

    return () => {
      unsubProducts();
      unsubSessions();
    };
  }, [isAdmin, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.isActive).length,
    totalSessions: sessions.length,
    completedSessions: sessions.filter((s) => s.status === 'completed').length,
    totalRevenue: sessions
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + s.totalAmount, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-12 h-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-strong rounded-3xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Manage your vending machines</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            icon={<Package className="w-6 h-6" />}
            title="Total Products"
            value={stats.totalProducts}
            color="bg-blue-500"
          />
          <StatsCard
            icon={<Activity className="w-6 h-6" />}
            title="Active Products"
            value={stats.activeProducts}
            color="bg-green-500"
          />
          <StatsCard
            icon={<ShoppingBag className="w-6 h-6" />}
            title="Sessions Today"
            value={stats.completedSessions}
            color="bg-purple-500"
          />
          <StatsCard
            icon={<DollarSign className="w-6 h-6" />}
            title="Revenue"
            value={`$${(stats.totalRevenue / 100).toFixed(2)}`}
            color="bg-amber-500"
          />
        </div>

        {/* Tabs */}
        <div className="glass-strong rounded-3xl overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 py-4 font-semibold transition-colors ${
                activeTab === 'products'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 py-4 font-semibold transition-colors ${
                activeTab === 'sessions'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Recent Sessions
            </button>
          </div>

          {activeTab === 'products' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
                <button
                  onClick={() => setIsAddingProduct(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Product
                </button>
              </div>

              <ProductList
                products={products}
                onEdit={setEditingProduct}
                onDelete={async (productId) => {
                  if (confirm('Are you sure you want to delete this product?')) {
                    try {
                      await deleteDoc(doc(db, 'inventory', productId));
                      toast.success('Product deleted');
                    } catch (error) {
                      toast.error('Failed to delete product');
                    }
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Sessions</h2>
              <SessionList sessions={sessions} />
            </div>
          )}
        </div>
      </div>

      {/* Product Form Modal */}
      <AnimatePresence>
        {(isAddingProduct || editingProduct) && (
          <ProductFormModal
            product={editingProduct}
            onClose={() => {
              setIsAddingProduct(false);
              setEditingProduct(null);
            }}
            onSave={async (productData) => {
              try {
                if (editingProduct) {
                  await updateDoc(doc(db, 'inventory', editingProduct.id), {
                    ...productData,
                    updatedAt: serverTimestamp(),
                  });
                  toast.success('Product updated');
                } else {
                  await addDoc(collection(db, 'inventory'), {
                    ...productData,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                  toast.success('Product added');
                }
                setIsAddingProduct(false);
                setEditingProduct(null);
              } catch (error) {
                toast.error('Failed to save product');
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-6"
    >
      <div className={`w-12 h-12 rounded-xl ${color} text-white flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-gray-600 text-sm mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </motion.div>
  );
}

function ProductList({
  products,
  onEdit,
  onDelete,
}: {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {products.map((product) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 hover:bg-white/80 transition-colors"
        >
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/80?text=?';
                }}
              />
            ) : (
              <Package className="w-8 h-8 text-primary-400" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-1">{product.description}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm font-medium text-primary-600">
                ${(product.price / 100).toFixed(2)}
              </span>
              <span className="text-sm text-gray-600">Slot: {product.slot}</span>
              <span className="text-sm text-gray-600">Stock: {product.quantity}</span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {product.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onEdit(product)}
              className="p-3 rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(product.id)}
              className="p-3 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function SessionList({ sessions }: { sessions: Session[] }) {
  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-white/50"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-gray-900">Session {session.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-600">
                {session.createdAt?.toLocaleString()}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                session.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : session.status === 'active'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {session.status}
            </span>
          </div>

          <div className="space-y-2">
            {session.basket.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.productName} x{item.quantity}
                </span>
                <span className="text-gray-900 font-medium">
                  ${((item.price * item.quantity) / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mt-3 pt-3 border-t">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="text-lg font-bold text-primary-600">
              ${(session.totalAmount / 100).toFixed(2)}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ProductFormModal({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    imageUrl: product?.imageUrl || '',
    slot: product?.slot || 1,
    price: product?.price || 0,
    quantity: product?.quantity || 0,
    vendingMachineId: product?.vendingMachineId || 'machine_001',
    category: product?.category || 'snacks',
    isActive: product?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="glass-strong rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {product ? 'Edit Product' : 'Add Product'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (cents)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                  required
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slot</label>
                <input
                  type="number"
                  value={formData.slot}
                  onChange={(e) => setFormData({ ...formData, slot: parseInt(e.target.value) })}
                  required
                  min="1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  required
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Product
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
