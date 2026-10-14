import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { verifyToken, verifyRole } from '../middlewares/authMiddleware';

const router = Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventory: true
      }
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get personalized recommendations based on purchase history and stock > 0
router.get('/recommendations', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Base query: products with stock > 0
    let products = await prisma.product.findMany({
      where: {
        inventory: {
          stock: { gt: 0 }
        }
      },
      include: {
        inventory: true
      }
    });

    if (userId && typeof userId === 'string') {
      // 1. Get user purchase history
      const history = await prisma.transactionItem.findMany({
        where: {
          transaction: {
            userId: userId,
            status: { in: ['PAID', 'PENDING'] }
          }
        },
        include: { product: true }
      });

      if (history.length > 0) {
        // 2. Extract keywords from past purchases (Content-Based Filtering)
        const pastKeywords = new Set<string>();
        history.forEach(item => {
          const words = item.product.name.toLowerCase().split(/\s+/);
          words.forEach(w => pastKeywords.add(w));
        });

        // 3. Score products based on keyword matching
        const scoredProducts = products.map(p => {
          const productWords = p.name.toLowerCase().split(/\s+/);
          let score = 0;
          productWords.forEach(w => {
            if (pastKeywords.has(w)) score += 1;
          });
          return { product: p, score };
        });

        // Sort by score descending and return top 4
        scoredProducts.sort((a, b) => b.score - a.score);
        products = scoredProducts.map(sp => sp.product);
      }
    }

    // Return max 4 products (randomize slightly if no history to simulate freshness)
    // For a real production app, use proper ML or advanced DB queries.
    if (!userId || products.length === 0) {
       products = products.sort(() => 0.5 - Math.random());
    }

    res.json(products.slice(0, 4));
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        inventory: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product (ADMIN only)
router.post('/', verifyToken, verifyRole(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price, imageUrl, cutoutUrl, model3dUrl, stock, category, subcategory } = req.body;
    
    if (!name || !price || !imageUrl) {
      res.status(400).json({ error: 'Name, price, and image URL are required' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        price: Number(price),
        imageUrl,
        cutoutUrl: cutoutUrl || null,
        model3dUrl: model3dUrl || null,
        category: category || 'pria',
        subcategory: subcategory || 'kaos',
        inventory: {
          create: {
            stock: Number(stock) || 0,
            reservedStock: 0
          }
        }
      },
      include: { inventory: true }
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product (ADMIN only)
router.put('/:id', verifyToken, verifyRole(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, description, price, imageUrl, cutoutUrl, model3dUrl, stock, category, subcategory } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = Number(price);
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (cutoutUrl !== undefined) data.cutoutUrl = cutoutUrl;
    if (model3dUrl !== undefined) data.model3dUrl = model3dUrl;
    if (category !== undefined) data.category = category;
    if (subcategory !== undefined) data.subcategory = subcategory;
    if (stock !== undefined) {
      data.inventory = {
        update: { stock: Number(stock) }
      };
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { inventory: true }
    });

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product (ADMIN only)
router.delete('/:id', verifyToken, verifyRole(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    
    // Cek apakah produk terkait dengan transaksi yang sudah ada
    const relatedItems = await prisma.transactionItem.count({ where: { productId: id } });
    if (relatedItems > 0) {
      res.status(400).json({ 
        error: `Produk tidak dapat dihapus karena tercatat dalam ${relatedItems} transaksi pelanggan. Anda dapat mengubah stok menjadi 0 jika ingin menonaktifkannya.` 
      });
      return;
    }

    // Hapus relasi wishlist dan inventory sebelum menghapus produk
    await prisma.wishlist.deleteMany({ where: { productId: id } });
    await prisma.inventory.deleteMany({ where: { productId: id } });
    await prisma.product.delete({
      where: { id }
    });

    res.json({ message: 'Produk berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
