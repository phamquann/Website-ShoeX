const mongoose = require('mongoose');
const config = require('../configs');
const slugify = require('slugify');

// Models
const roleModel = require('../schemas/roles');
const userModel = require('../schemas/users');
const permissionModel = require('../schemas/permissions');
const brandModel = require('../schemas/brands');
const categoryModel = require('../schemas/categories');
const productModel = require('../schemas/products');
const productVariantModel = require('../schemas/productVariants');

mongoose.connect(config.MONGODB_URI)
  .then(() => console.log('MongoDB Connected for Seeding'))
  .catch(err => { console.error(err); process.exit(1); });

const seedData = async () => {
  try {
    console.log('--- Clearing ALL collections ---');
    await mongoose.connection.dropDatabase();
    console.log('✅ Database dropped (indexes cleared)');

    // ===== 1. PERMISSIONS =====
    console.log('--- Seeding Permissions ---');
    const perms = [
      { resource: 'product', action: 'manage', description: 'Full control over products' },
      { resource: 'product', action: 'read', description: 'Can view products' },
      { resource: 'user', action: 'manage', description: 'Full control over users' },
      { resource: 'brand', action: 'manage', description: 'Full control over brands' },
      { resource: 'category', action: 'manage', description: 'Full control over categories' },
      { resource: 'inventory', action: 'manage', description: 'Full control over inventory' }
    ];
    const insertedPerms = [];
    for (const p of perms) {
      const pm = await permissionModel.create({
        name: `${p.action.toUpperCase()}_${p.resource.toUpperCase()}`, ...p
      });
      insertedPerms.push(pm);
    }

    // ===== 2. ROLES =====
    console.log('--- Seeding Roles ---');
    const adminRole = await roleModel.create({ name: 'ADMIN', description: 'Super Administrator', permissions: insertedPerms.map(p => p._id) });
    const staffRole = await roleModel.create({ name: 'STAFF', description: 'Staff member' });
    const customerRole = await roleModel.create({ name: 'CUSTOMER', description: 'Normal Customer' });

    // ===== 3. USERS =====
    console.log('--- Seeding Users ---');
    await userModel.create([
      { username: 'admin', email: 'admin@system.com', password: 'admin', fullName: 'Admin System', phone: '0901234567', role: adminRole._id },
      { username: 'staff01', email: 'staff01@system.com', password: 'staff', fullName: 'Nguyen Van Staff', phone: '0912345678', role: staffRole._id },
      { username: 'customer01', email: 'customer@test.com', password: 'pass', fullName: 'Tran Thi Customer', phone: '0987654321', role: customerRole._id }
    ]);

    // ===== 4. BRANDS =====
    console.log('--- Seeding Brands ---');
    const brandsData = [
      { name: 'Nike', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg', description: 'Just Do It - Thương hiệu giày thể thao hàng đầu thế giới' },
      { name: 'Adidas', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg', description: 'Impossible Is Nothing - Giày thể thao Đức' },
      { name: 'Puma', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Puma_complete_logo.svg', description: 'Forever Faster - Giày thể thao cao cấp' },
      { name: 'Converse', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Converse_logo.svg', description: 'Classic sneaker brand since 1908' },
      { name: 'New Balance', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/New_Balance_logo.svg', description: 'Fearlessly Independent Since 1906' },
      { name: 'Vans', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Vans-logo.svg', description: 'Off The Wall - Giày skateboard iconic' }
    ];
    const brands = [];
    for (const b of brandsData) {
      const brand = await brandModel.create({ ...b, slug: slugify(b.name, { lower: true, strict: true }) });
      brands.push(brand);
    }
    const [nike, adidas, puma, converse, newBalance, vans] = brands;

    // ===== 5. CATEGORIES =====
    console.log('--- Seeding Categories ---');
    const catsData = [
      { name: 'Giày Thể Thao', description: 'Giày thể thao đa năng' },
      { name: 'Giày Chạy Bộ', description: 'Giày chuyên dụng cho chạy bộ' },
      { name: 'Giày Sneaker', description: 'Sneaker thời trang streetwear' },
      { name: 'Giày Nam', description: 'Bộ sưu tập giày dành cho nam' },
      { name: 'Giày Nữ', description: 'Bộ sưu tập giày dành cho nữ' },
      { name: 'Giày Bóng Rổ', description: 'Giày chuyên dụng cho bóng rổ' }
    ];
    const categories = [];
    for (const c of catsData) {
      const cat = await categoryModel.create({ ...c, slug: slugify(c.name, { lower: true, strict: true }) });
      categories.push(cat);
    }
    const [catSport, catRunning, catSneaker, catNam, catNu, catBasketball] = categories;

    // ===== 6. COLORS (dùng cho variants) =====
    const colorsPool = [
      { name: 'Đen', hexCode: '#000000' },
      { name: 'Trắng', hexCode: '#FFFFFF' },
      { name: 'Xám', hexCode: '#808080' },
      { name: 'Đỏ', hexCode: '#FF0000' },
      { name: 'Xanh Dương', hexCode: '#0000FF' }
    ];
    const sizesPool = ['38', '39', '40', '41', '42'];

    // ===== 7. PRODUCTS (25 sản phẩm) =====
    console.log('--- Seeding Products ---');
    const productsData = [
      // Nike (5)
      { name: 'Nike Air Max 90', sku: 'NIKE-AM90', description: 'Biểu tượng thời trang đường phố với đệm Air Max visible.', originalPrice: 3500000, salePrice: 2990000, brand: nike._id, category: catSneaker._id, thumbnail: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/0bd6a857-4597-4b0e-bba5-9e4a28f75390/AIR+MAX+90.png' },
      { name: 'Nike Air Force 1 Low', sku: 'NIKE-AF1L', description: 'Huyền thoại bóng rổ trở thành icon thời trang.', originalPrice: 2800000, salePrice: 2500000, brand: nike._id, category: catSneaker._id, thumbnail: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/350e7f3a-979a-402b-9396-a4e89dfa3eb3/AIR+FORCE+1+%2707.png' },
      { name: 'Nike Revolution 7', sku: 'NIKE-REV7', description: 'Giày chạy bộ nhẹ, đệm mềm mại, thoáng khí.', originalPrice: 2200000, salePrice: 1890000, brand: nike._id, category: catRunning._id, thumbnail: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/b89be8f0-14f0-493e-ab0e-89df29e53a66/NIKE+REVOLUTION+7.png' },
      { name: 'Nike Dunk Low Retro', sku: 'NIKE-DNKL', description: 'Thiết kế retro từ sân bóng rổ đại học.', originalPrice: 3200000, salePrice: 2790000, brand: nike._id, category: catSneaker._id, thumbnail: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/3b0c974e-b1f3-4423-97d5-ee498b1e6380/DUNK+LOW+RETRO.png' },
      { name: 'Nike ZoomX Vaporfly', sku: 'NIKE-ZXVF', description: 'Giày chạy thi đấu với công nghệ ZoomX foam và tấm carbon.', originalPrice: 6500000, salePrice: 5990000, brand: nike._id, category: catRunning._id, thumbnail: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/b02cb320-0d3d-4bbd-aa0f-e65d0b398507/ZOOMX+VAPORFLY+NEXT%25+3.png' },
      // Adidas (5)
      { name: 'Adidas Ultraboost Light', sku: 'ADI-UBLGT', description: 'Trải nghiệm chạy bộ êm ái nhất với công nghệ BOOST.', originalPrice: 4500000, salePrice: 3990000, brand: adidas._id, category: catRunning._id, thumbnail: 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/3bfa1e7d0a5d4ef195c7475b0112f94b_9366/Ultraboost_Light_Running_Shoes_White_HQ6351_HM1.jpg' },
      { name: 'Adidas Stan Smith', sku: 'ADI-STSM', description: 'Biểu tượng tennis cổ điển. Thiết kế tối giản.', originalPrice: 2500000, salePrice: 2190000, brand: adidas._id, category: catSneaker._id, thumbnail: 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/68fabordf6e14f2f85e9af0500b0be08_9366/Stan_Smith_Shoes_White_FX5502_HM1.jpg' },
      { name: 'Adidas Superstar', sku: 'ADI-SPST', description: 'Shell toe huyền thoại từ sàn bóng rổ đến đường phố.', originalPrice: 2800000, salePrice: 2390000, brand: adidas._id, category: catSneaker._id, thumbnail: 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/7ed0855435194229a525aad6009a0497_9366/Superstar_Shoes_White_EG4958_HM1.jpg' },
      { name: 'Adidas Gazelle', sku: 'ADI-GZLL', description: 'Cổ điển từ thập niên 60, phong cách vintage hiện đại.', originalPrice: 2600000, salePrice: 2290000, brand: adidas._id, category: catSneaker._id, thumbnail: 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/2a129efde0ed4a109e76afbc00ba1c3c_9366/Gazelle_Shoes_Black_BB5476_HM1.jpg' },
      { name: 'Adidas Duramo Speed', sku: 'ADI-DRMS', description: 'Giày chạy bộ hàng ngày nhẹ và thoáng khí.', originalPrice: 2000000, salePrice: 1690000, brand: adidas._id, category: catRunning._id, thumbnail: 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/ce2c1f5753c0462ab28a8138be3d2d20_9366/Duramo_Speed_Running_Shoes_Black_ID9850_HM1.jpg' },
      // Puma (4)
      { name: 'Puma RS-X', sku: 'PMA-RSX', description: 'Giày chạy retro-futuristic với đệm RS technology.', originalPrice: 3000000, salePrice: 2590000, brand: puma._id, category: catSneaker._id, thumbnail: 'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_750,h_750/global/371008/03/sv01/fnd/PNA/fmt/png' },
      { name: 'Puma Suede Classic', sku: 'PMA-SDCL', description: 'Icon từ năm 1968. Formstrip huyền thoại.', originalPrice: 2200000, salePrice: 1890000, brand: puma._id, category: catSneaker._id, thumbnail: 'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_750,h_750/global/374915/01/sv01/fnd/PNA/fmt/png' },
      { name: 'Puma Velocity Nitro 2', sku: 'PMA-VN2', description: 'Giày chạy bộ với công nghệ NITRO foam.', originalPrice: 3500000, salePrice: 2990000, brand: puma._id, category: catRunning._id, thumbnail: 'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_750,h_750/global/376599/07/sv01/fnd/PNA/fmt/png' },
      { name: 'Puma Court Rider', sku: 'PMA-CTRD', description: 'Giày bóng rổ hiệu năng cao. ProFoam đệm tối ưu.', originalPrice: 3200000, salePrice: 2790000, brand: puma._id, category: catBasketball._id, thumbnail: 'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_750,h_750/global/195634/06/sv01/fnd/PNA/fmt/png' },
      // Converse (4)
      { name: 'Converse Chuck Taylor All Star', sku: 'CVS-CTAS', description: 'Classic high-top canvas sneaker. Biểu tượng văn hóa đường phố.', originalPrice: 1800000, salePrice: 1500000, brand: converse._id, category: catSneaker._id, thumbnail: 'https://www.converse.com/dw/image/v2/BCZC_PRD/on/demandware.static/-/Sites-cnv-master-catalog/default/dw17928170/images/a_107/M9160_A_107X1.jpg' },
      { name: 'Converse Chuck 70', sku: 'CVS-C70', description: 'Phiên bản cao cấp của Chuck Taylor. Canvas dày hơn.', originalPrice: 2200000, salePrice: 1890000, brand: converse._id, category: catSneaker._id, thumbnail: 'https://www.converse.com/dw/image/v2/BCZC_PRD/on/demandware.static/-/Sites-cnv-master-catalog/default/dw6cddd0f2/images/a_107/162050C_A_107X1.jpg' },
      { name: 'Converse One Star', sku: 'CVS-OS', description: 'Da lộn premium với ngôi sao đơn iconic.', originalPrice: 2000000, salePrice: 1690000, brand: converse._id, category: catSneaker._id, thumbnail: 'https://www.converse.com/dw/image/v2/BCZC_PRD/on/demandware.static/-/Sites-cnv-master-catalog/default/dw0e84c2c0/images/a_107/171553C_A_107X1.jpg' },
      { name: 'Converse Run Star Hike', sku: 'CVS-RSH', description: 'Platform sneaker hiện đại. Đế nâng cao, răng cưa độc đáo.', originalPrice: 2800000, salePrice: 2390000, brand: converse._id, category: catSneaker._id, thumbnail: 'https://www.converse.com/dw/image/v2/BCZC_PRD/on/demandware.static/-/Sites-cnv-master-catalog/default/dw94e5e2aa/images/a_107/166800C_A_107X1.jpg' },
      // New Balance (4)
      { name: 'New Balance 574', sku: 'NB-574', description: 'Classic lifestyle sneaker. Đệm ENCAP thoải mái.', originalPrice: 2500000, salePrice: 2190000, brand: newBalance._id, category: catSneaker._id, thumbnail: 'https://nb.scene7.com/is/image/NB/ml574evg_nb_02_i?$pdpflexf2$&qlt=80&wid=880&hei=880' },
      { name: 'New Balance Fresh Foam 1080v13', sku: 'NB-FF1080', description: 'Đệm Fresh Foam X cao cấp cho mọi cự ly.', originalPrice: 4500000, salePrice: 3990000, brand: newBalance._id, category: catRunning._id, thumbnail: 'https://nb.scene7.com/is/image/NB/m1080v13_nb_02_i?$pdpflexf2$&qlt=80&wid=880&hei=880' },
      { name: 'New Balance 550', sku: 'NB-550', description: 'Heritage basketball sneaker tái sinh. Retro 80s.', originalPrice: 3200000, salePrice: 2790000, brand: newBalance._id, category: catSneaker._id, thumbnail: 'https://nb.scene7.com/is/image/NB/bb550wt1_nb_02_i?$pdpflexf2$&qlt=80&wid=880&hei=880' },
      { name: 'New Balance FuelCell Rebel v3', sku: 'NB-FCR3', description: 'Giày chạy tốc độ với FuelCell foam.', originalPrice: 3800000, salePrice: 3290000, brand: newBalance._id, category: catRunning._id, thumbnail: 'https://nb.scene7.com/is/image/NB/mfcxmb3_nb_02_i?$pdpflexf2$&qlt=80&wid=880&hei=880' },
      // Vans (3)
      { name: 'Vans Old Skool', sku: 'VANS-OS', description: 'Sidestripe huyền thoại. Giày skate đầu tiên.', originalPrice: 1800000, salePrice: 1500000, brand: vans._id, category: catSneaker._id, thumbnail: 'https://images.vans.com/is/image/Vans/VN000D3HY28-HERO?$583x583$' },
      { name: 'Vans Authentic', sku: 'VANS-AUTH', description: 'Giày đầu tiên của Vans. Canvas đơn giản, classic since 1966.', originalPrice: 1500000, salePrice: 1290000, brand: vans._id, category: catSneaker._id, thumbnail: 'https://images.vans.com/is/image/Vans/VN000EE3BLK-HERO?$583x583$' },
      { name: 'Vans Sk8-Hi', sku: 'VANS-SK8', description: 'High-top skateboard sneaker với đệm cổ chân.', originalPrice: 2000000, salePrice: 1690000, brand: vans._id, category: catSneaker._id, thumbnail: 'https://images.vans.com/is/image/Vans/VN000D5IB8C-HERO?$583x583$' }
    ];

    const products = [];
    for (const p of productsData) {
      const slug = slugify(p.name, { lower: true, strict: true }) + '-' + Date.now();
      // Embed 2 images per product
      const images = [
        { url: p.thumbnail, isPrimary: true, sortOrder: 0 },
        { url: `https://placehold.co/800x800/1a1a2e/e94560?text=${encodeURIComponent(p.name)}`, isPrimary: false, sortOrder: 1 }
      ];
      const product = await productModel.create({ ...p, slug, images });
      products.push(product);
    }

    // ===== 8. VARIANTS (embedded size/color/inventory) =====
    console.log('--- Seeding Variants ---');
    let variantCount = 0;

    for (const product of products) {
      // Pick 2 random colors, 3 random sizes
      const selectedColors = [...colorsPool].sort(() => 0.5 - Math.random()).slice(0, 2);
      const selectedSizes = [...sizesPool].sort(() => 0.5 - Math.random()).slice(0, 3);

      for (const color of selectedColors) {
        for (const size of selectedSizes) {
          variantCount++;
          const sku = `${product.sku}-${color.name.substring(0, 2).toUpperCase()}-${size}`;
          const stock = Math.floor(Math.random() * 50) + 5;

          await productVariantModel.create({
            product: product._id,
            size,
            color: { name: color.name, hexCode: color.hexCode },
            sku,
            price: 0,
            stock,
            reserved: 0,
            soldCount: Math.floor(Math.random() * 20)
          });
        }
      }
    }

    console.log('');
    console.log('========================================');
    console.log('✅ SEED COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log(`📦 Brands:     ${brands.length}`);
    console.log(`📁 Categories: ${categories.length}`);
    console.log(`👟 Products:   ${products.length} (with embedded images)`);
    console.log(`🔀 Variants:   ${variantCount} (with embedded size/color/inventory)`);
    console.log('========================================');
    console.log('');
    console.log('👤 Admin: admin / admin');
    console.log('👤 Staff: staff01 / staff');
    console.log('👤 Customer: customer01 / pass');
    console.log('');

    process.exit();
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();
