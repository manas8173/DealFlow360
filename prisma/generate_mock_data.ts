import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function generateData() {
  console.log('🚀 Starting generation of ~250-300 rich records for DealFlow360...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ── 1. Create Extra Product Categories ──────────────────────────────────────
  console.log('📦 Setting up Product Categories...');
  const newCategories = [
    { name: 'Cloud Infrastructure', discountCeilingPercent: 20 },
    { name: 'Enterprise Security', discountCeilingPercent: 18 },
    { name: 'Networking & Telecom', discountCeilingPercent: 15 },
    { name: 'Peripherals & Accessories', discountCeilingPercent: 25 },
    { name: 'Storage & Backup', discountCeilingPercent: 16 },
  ];

  for (const cat of newCategories) {
    await prisma.productCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  const allCategories = await prisma.productCategory.findMany();
  const catMap = new Map(allCategories.map((c) => [c.name, c.id]));
  const defaultCatId = allCategories[0].id;

  // ── 2. Create Warehouses ───────────────────────────────────────────────────
  console.log('🏭 Setting up Regional Warehouses...');
  const warehousesData = [
    { name: 'West Coast Logistics Center', code: 'WH-WEST', location: 'Fremont, CA, USA' },
    { name: 'Frankfurt Central Depot', code: 'WH-FRA', location: 'Frankfurt, Germany' },
    { name: 'Singapore Regional Hub', code: 'WH-SIN', location: 'Jurong, Singapore' },
    { name: 'London Thames Facility', code: 'WH-LON', location: 'Dartford, London, UK' },
    { name: 'Tokyo Narita Depot', code: 'WH-NRT', location: 'Chiba, Tokyo, Japan' },
    { name: 'Mumbai Logistics Center', code: 'WH-BOM', location: 'Bhiwandi, Mumbai, India' },
    { name: 'Texas Distribution Hub', code: 'WH-TEX', location: 'Dallas, TX, USA' },
  ];

  for (const wh of warehousesData) {
    await prisma.warehouse.upsert({
      where: { code: wh.code },
      update: {},
      create: wh,
    });
  }

  const allWarehouses = await prisma.warehouse.findMany();
  console.log(`✅ Total Warehouses in DB: ${allWarehouses.length}`);

  // ── 3. Create Products (~100 items) ─────────────────────────────────────────
  console.log('💻 Generating Catalog Products (~100 items)...');
  const productDefinitions: Array<{
    sku: string;
    name: string;
    category: string;
    basePrice: number;
    costPrice: number;
    taxPercent: number;
    unit: string;
    description: string;
  }> = [
    // Hardware
    { sku: 'HW-SRV-01', name: 'PowerEdge R750 Enterprise Server', category: 'Hardware', basePrice: 420000, costPrice: 315000, taxPercent: 18, unit: 'unit', description: 'Dual Intel Xeon Gold, 128GB ECC RAM, 4TB NVMe SSD' },
    { sku: 'HW-SRV-02', name: 'ProLiant DL380 Gen10 Rack Server', category: 'Hardware', basePrice: 385000, costPrice: 285000, taxPercent: 18, unit: 'unit', description: '2U Rack Server, 64GB DDR4, redundant hot-swap power supplies' },
    { sku: 'HW-WRK-01', name: 'ThinkStation P620 Workstation', category: 'Hardware', basePrice: 245000, costPrice: 180000, taxPercent: 18, unit: 'unit', description: 'AMD Ryzen Threadripper PRO, 64GB RAM, RTX A4000 GPU' },
    { sku: 'HW-WRK-02', name: 'Precision 5820 Tower Workstation', category: 'Hardware', basePrice: 215000, costPrice: 160000, taxPercent: 18, unit: 'unit', description: 'Intel Core i9 14th Gen, 32GB RAM, 1TB NVMe Gen4' },
    { sku: 'HW-LAP-02', name: 'MacBook Pro 16" M3 Max Enterprise', category: 'Hardware', basePrice: 329000, costPrice: 260000, taxPercent: 18, unit: 'unit', description: '16-core CPU, 40-core GPU, 36GB Unified Memory, 1TB SSD' },
    { sku: 'HW-LAP-03', name: 'ThinkPad X1 Carbon Gen 12', category: 'Hardware', basePrice: 175000, costPrice: 135000, taxPercent: 18, unit: 'unit', description: 'Intel Core Ultra 7, 32GB LPDDR5x, 14" 2.8K OLED display' },
    { sku: 'HW-LAP-04', name: 'Dell Latitude 7440 Ultrabook', category: 'Hardware', basePrice: 145000, costPrice: 110000, taxPercent: 18, unit: 'unit', description: 'Lightweight business laptop, 16GB RAM, 512GB SSD, vPro enabled' },
    { sku: 'HW-LAP-05', name: 'HP Elite Dragonfly G4', category: 'Hardware', basePrice: 165000, costPrice: 125000, taxPercent: 18, unit: 'unit', description: 'Sub-1kg magnesium chassis, 5G LTE connectivity, 32GB RAM' },
    { sku: 'HW-DISP-01', name: 'UltraSharp 34" Curved USB-C Hub Monitor', category: 'Hardware', basePrice: 78000, costPrice: 56000, taxPercent: 18, unit: 'unit', description: 'WQHD IPS Black display with 90W power delivery and RJ45 ethernet' },
    { sku: 'HW-DISP-02', name: 'ProArt 27" 4K Color-Accurate Display', category: 'Hardware', basePrice: 62000, costPrice: 45000, taxPercent: 18, unit: 'unit', description: '100% sRGB/Rec.709, Delta E < 2, Calman Verified for design teams' },
    { sku: 'HW-GPU-01', name: 'NVIDIA RTX 6000 Ada Generation (48GB)', category: 'Hardware', basePrice: 650000, costPrice: 520000, taxPercent: 18, unit: 'unit', description: 'Workstation GPU for deep learning, generative AI, and 3D rendering' },
    { sku: 'HW-GPU-02', name: 'NVIDIA A100 Tensor Core 80GB SXM', category: 'Hardware', basePrice: 1150000, costPrice: 950000, taxPercent: 18, unit: 'unit', description: 'Hyperscale AI training and high performance computing accelerator' },

    // Cloud Infrastructure
    { sku: 'CLD-VPC-01', name: 'Dedicated Multi-Region Virtual Private Cloud', category: 'Cloud Infrastructure', basePrice: 180000, costPrice: 120000, taxPercent: 18, unit: 'month', description: 'Private isolated network topology across 3 availability zones' },
    { sku: 'CLD-K8S-01', name: 'Managed Enterprise Kubernetes Cluster (EKS)', category: 'Cloud Infrastructure', basePrice: 125000, costPrice: 85000, taxPercent: 18, unit: 'month', description: 'Automated upgrades, node auto-scaling, 99.99% uptime SLA' },
    { sku: 'CLD-DB-01', name: 'High-Availability PostgreSQL Aurora Cluster', category: 'Cloud Infrastructure', basePrice: 95000, costPrice: 65000, taxPercent: 18, unit: 'month', description: 'Multi-AZ replication, automated point-in-time recovery, 1TB storage' },
    { sku: 'CLD-REDIS-01', name: 'In-Memory Caching Cluster (Cluster Redis)', category: 'Cloud Infrastructure', basePrice: 45000, costPrice: 28000, taxPercent: 18, unit: 'month', description: 'Clustered Redis deployment with automatic failover and read replicas' },
    { sku: 'CLD-CDN-01', name: 'Enterprise Edge CDN & DDoS Shield', category: 'Cloud Infrastructure', basePrice: 65000, costPrice: 40000, taxPercent: 18, unit: 'month', description: 'Global Anycast network, WAF rules, real-time DDoS mitigation' },
    { sku: 'CLD-AI-01', name: 'Dedicated LLM Inference Gateway Pod', category: 'Cloud Infrastructure', basePrice: 220000, costPrice: 160000, taxPercent: 18, unit: 'month', description: 'Low-latency private endpoint for Claude / Llama-3 self-hosted inferencing' },

    // Enterprise Security
    { sku: 'SEC-FW-01', name: 'Palo Alto PA-3410 Next-Gen Firewall', category: 'Enterprise Security', basePrice: 520000, costPrice: 410000, taxPercent: 18, unit: 'unit', description: 'Next-Gen Firewall with WildFire malware prevention and URL filtering' },
    { sku: 'SEC-FW-02', name: 'Fortinet FortiGate 200F Security Appliance', category: 'Enterprise Security', basePrice: 340000, costPrice: 260000, taxPercent: 18, unit: 'unit', description: 'High-throughput enterprise firewall with integrated SD-WAN' },
    { sku: 'SEC-EDR-01', name: 'CrowdStrike Falcon Endpoint Protection (100 seats)', category: 'Enterprise Security', basePrice: 280000, costPrice: 190000, taxPercent: 18, unit: 'year', description: 'Cloud-native AI endpoint detection, response, and threat hunting' },
    { sku: 'SEC-ZTNA-01', name: 'Zero Trust Network Access Gateway License', category: 'Enterprise Security', basePrice: 195000, costPrice: 130000, taxPercent: 18, unit: 'year', description: 'Identity-aware application perimeter replacing legacy VPNs' },
    { sku: 'SEC-SIEM-01', name: 'Cloud SIEM & Threat Intelligence Platform', category: 'Enterprise Security', basePrice: 360000, costPrice: 250000, taxPercent: 18, unit: 'year', description: 'Centralized log aggregation, behavioral anomaly detection, SOAR workflows' },
    { sku: 'SEC-VAULT-01', name: 'Enterprise Secret Management & HSM Module', category: 'Enterprise Security', basePrice: 175000, costPrice: 115000, taxPercent: 18, unit: 'year', description: 'Hardware security module with PKI and automated credential rotation' },

    // Networking & Telecom
    { sku: 'NET-SW-01', name: 'Cisco Catalyst 9300 48-Port PoE+ Switch', category: 'Networking & Telecom', basePrice: 285000, costPrice: 215000, taxPercent: 18, unit: 'unit', description: 'Stackable enterprise access layer switch, 480 Gbps stacking' },
    { sku: 'NET-SW-02', name: 'Aruba CX 6200F 24G 4SFP+ Managed Switch', category: 'Networking & Telecom', basePrice: 165000, costPrice: 120000, taxPercent: 18, unit: 'unit', description: 'Layer 3 enterprise campus switch with built-in analytics engine' },
    { sku: 'NET-WIFI-01', name: 'Cisco Catalyst 9130AX Series Wi-Fi 6E AP', category: 'Networking & Telecom', basePrice: 85000, costPrice: 62000, taxPercent: 18, unit: 'unit', description: 'Tri-band 8x8 Wi-Fi 6E Access Point for ultra-dense campus coverage' },
    { sku: 'NET-WIFI-02', name: 'Aruba AP-635 Campus Access Point', category: 'Networking & Telecom', basePrice: 72000, costPrice: 51000, taxPercent: 18, unit: 'unit', description: 'Wi-Fi 6E with 3.9 Gbps maximum aggregate rate and IoT BLE beaconing' },
    { sku: 'NET-RTR-01', name: 'Cisco ISR 4331 Integrated Services Router', category: 'Networking & Telecom', basePrice: 230000, costPrice: 170000, taxPercent: 18, unit: 'unit', description: 'Modular WAN branch router with integrated voice and crypto engine' },

    // Storage & Backup
    { sku: 'STR-SAN-01', name: 'Dell PowerStore 500T All-Flash Array 46TB', category: 'Storage & Backup', basePrice: 980000, costPrice: 750000, taxPercent: 18, unit: 'unit', description: 'Active-Active NVMe SAN storage, 4:1 data reduction guarantee' },
    { sku: 'STR-NAS-01', name: 'Synology RackStation RS3621xs+ 12-Bay NAS', category: 'Storage & Backup', basePrice: 295000, costPrice: 220000, taxPercent: 18, unit: 'unit', description: 'High-performance 12-bay rackmount NAS with dual 10GbE SFP+' },
    { sku: 'STR-BCK-01', name: 'Veeam Enterprise Backup License (50 Sockets)', category: 'Storage & Backup', basePrice: 210000, costPrice: 145000, taxPercent: 18, unit: 'year', description: 'Comprehensive VM, physical server, and cloud workload disaster recovery' },
    { sku: 'STR-TAPE-01', name: 'HPE StoreEver MSL 1/8 G2 Tape Autoloader', category: 'Storage & Backup', basePrice: 320000, costPrice: 240000, taxPercent: 18, unit: 'unit', description: 'LTO-9 tape autoloader for immutable offline air-gapped archival' },

    // Peripherals & Accessories
    { sku: 'PER-DOCK-01', name: 'CalDigit TS4 Thunderbolt 4 Dock 18-Port', category: 'Peripherals & Accessories', basePrice: 38000, costPrice: 26000, taxPercent: 18, unit: 'unit', description: '98W host charging, 2.5GbE LAN, UHS-II SD, dual 4K/single 8K support' },
    { sku: 'PER-CAM-01', name: 'Logitech Rally Bar Video Conference System', category: 'Peripherals & Accessories', basePrice: 285000, costPrice: 210000, taxPercent: 18, unit: 'unit', description: 'All-in-one 4K PTZ camera system with AI viewfinder and beamforming mics' },
    { sku: 'PER-HEAD-01', name: 'Jabra Evolve2 85 UC Wireless Headset', category: 'Peripherals & Accessories', basePrice: 32000, costPrice: 21000, taxPercent: 18, unit: 'unit', description: 'Active noise cancelling, 10-mic technology, 37-hour battery life' },
    { sku: 'PER-UPS-01', name: 'APC Smart-UPS On-Line 3000VA 230V 2U Rack', category: 'Peripherals & Accessories', basePrice: 145000, costPrice: 105000, taxPercent: 18, unit: 'unit', description: 'Double-conversion online power protection with management network card' },
    { sku: 'PER-KVM-01', name: 'ATEN 8-Port Cat 5 Over IP KVM Switch', category: 'Peripherals & Accessories', basePrice: 88000, costPrice: 62000, taxPercent: 18, unit: 'unit', description: 'Remote BIOS-level server management for distributed server rooms' },

    // Professional Services
    { sku: 'SRV-ARCH-01', name: 'Enterprise Cloud Migration Consulting', category: 'Services', basePrice: 180000, costPrice: 110000, taxPercent: 18, unit: 'project', description: 'End-to-end architecture design, migration plan, and runbook creation' },
    { sku: 'SRV-SEC-01', name: 'Quarterly External Penetration Testing', category: 'Services', basePrice: 250000, costPrice: 150000, taxPercent: 18, unit: 'quarter', description: 'Black-box and grey-box infrastructure and web application penetration audit' },
    { sku: 'SRV-SLA-01', name: 'Mission-Critical 24/7/365 Gold Support SLA', category: 'Services', basePrice: 300000, costPrice: 180000, taxPercent: 18, unit: 'year', description: '15-minute response time guarantee, dedicated Technical Account Manager' },
    { sku: 'SRV-TRAIN-01', name: 'DevSecOps & Kubernetes Team Workshop (3 Days)', category: 'Services', basePrice: 120000, costPrice: 60000, taxPercent: 18, unit: 'workshop', description: 'Hands-on training for up to 25 software engineers and DevOps specialists' },

    // Subscriptions
    { sku: 'SUB-ERP-01', name: 'DealFlow Enterprise CRM/ERP Seat (50 users)', category: 'Subscriptions', basePrice: 450000, costPrice: 270000, taxPercent: 18, unit: 'year', description: 'Full access to sales pipeline, warehouse logistics, approval chain automation' },
    { sku: 'SUB-DATA-01', name: 'Real-Time Financial Market Intelligence Feed', category: 'Subscriptions', basePrice: 220000, costPrice: 130000, taxPercent: 18, unit: 'month', description: 'Low-latency algorithmic trade indicators and commodity pricing APIs' },
  ];

  // Dynamically generate variants to reach 100+ items
  for (let i = 1; i <= 60; i++) {
    const categories = ['Hardware', 'Cloud Infrastructure', 'Enterprise Security', 'Networking & Telecom', 'Storage & Backup', 'Peripherals & Accessories', 'Services'];
    const chosenCat = categories[i % categories.length];
    productDefinitions.push({
      sku: `PRD-${chosenCat.substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`,
      name: `${chosenCat} Component Pro Module Gen-${(i % 5) + 1}`,
      category: chosenCat,
      basePrice: Math.round(15000 + (i * 4500)),
      costPrice: Math.round((15000 + (i * 4500)) * 0.72),
      taxPercent: 18,
      unit: i % 4 === 0 ? 'month' : 'unit',
      description: `High-availability modular enterprise asset certified for industrial standards (Batch Series ${i}).`,
    });
  }

  const createdProducts = [];
  for (const p of productDefinitions) {
    const categoryId = catMap.get(p.category) || defaultCatId;
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        description: p.description,
        categoryId,
        basePrice: p.basePrice,
        costPrice: p.costPrice,
        taxPercent: p.taxPercent,
        unit: p.unit,
      },
    });
    createdProducts.push(prod);
  }
  console.log(`✅ Total Products in DB: ${createdProducts.length}`);

  // ── 4. Create Inventory across Warehouses (~300-400 entries) ───────────────
  console.log('📦 Stocking Products across Warehouses...');
  let inventoryCount = 0;
  for (const prod of createdProducts) {
    // Distribute stock across 2-4 random warehouses
    const numWarehousesToStock = Math.floor(Math.random() * 3) + 2;
    const shuffledWarehouses = [...allWarehouses].sort(() => 0.5 - Math.random());
    const selectedWarehouses = shuffledWarehouses.slice(0, numWarehousesToStock);

    for (const wh of selectedWarehouses) {
      const onHandQty = Math.floor(Math.random() * 80) + 15;
      const reservedQty = Math.floor(Math.random() * 8);

      await prisma.inventoryItem.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: wh.id,
            productId: prod.id,
          },
        },
        update: {},
        create: {
          warehouseId: wh.id,
          productId: prod.id,
          onHandQty,
          reservedQty,
        },
      });
      inventoryCount++;
    }
  }
  console.log(`✅ Inventory Records generated: ${inventoryCount}`);

  // ── 5. Create Customer Companies (~50 companies) ───────────────────────────
  console.log('🏢 Generating Customer Companies (~50 companies)...');
  const companyNames = [
    'Apex Global Dynamics', 'Nexis Health Technologies', 'Starlight Aerospace Group', 'Quantum FinCorp',
    'BlueRidge BioTech Systems', 'Vanguard Logistics Corp', 'CyberShield Global', 'Horizon Retail Holdings',
    'Titan Heavy Industries', 'Solaria Green Energy', 'Pinnacle Capital Partners', 'AeroFlow Propulsion Labs',
    'Crestview Insurance', 'Orion Semiconductor Inc', 'Evergreen Media Networks', 'Summit AgriTech Solutions',
    'Aegis Defense Systems', 'Zenith Automations Ltd', 'Velocity Cloud Network', 'Novus Pharma International',
    'Beacon Maritime Freight', 'Ironclad Data Centers', 'Spectra Analytics Inc', 'Metropolis Smart Cities',
    'Hyperion Optics Corp', 'Silverline Banking Tech', 'TerraForm Materials Co', 'Aura Genomics Labs',
    'Palisade Risk Advisors', 'Krypton Quantum Works', 'Pulse Medical Robotics', 'Echo Distributed Systems',
    'Vortex Fluid Dynamics', 'Solas CleanTech Inc', 'Atlas Global Infrastructure', 'Catalyst Venture Studio',
    'Synergy Supply Chain', 'Valence NanoTech', 'Helix Biotherapeutics', 'Stratus Communications',
    'OmniTech Automation', 'Trident Deepsea Submersibles', 'Equinox Space Labs', 'Fortress Security Guild',
    'Lumina Photonic Devices', 'Integra Health Analytics', 'Prism Artificial Intelligence', 'Nexus Retail Matrix',
    'Ascent Cloud Engineering', 'Paramount Distribution Networks'
  ];

  const tiers = ['BRONZE', 'SILVER', 'GOLD'];
  const createdCustomers = [];

  for (let i = 0; i < companyNames.length; i++) {
    const comp = companyNames[i];
    const slug = comp.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `contact@${slug}.com`;
    const tier = tiers[i % tiers.length];

    const cust = await prisma.customer.upsert({
      where: { email },
      update: {},
      create: {
        name: comp,
        email,
        company: comp,
        tier,
      },
    });
    createdCustomers.push(cust);
  }
  console.log(`✅ Total Customer Companies: ${createdCustomers.length}`);

  // ── 6. Create Customer Portal Users (~50 users) ────────────────────────────
  console.log('👤 Generating Customer Portal Users...');
  const firstNames = ['Alexander', 'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia', 'Ethan', 'Ava', 'Mason', 'Isabella', 'Lucas', 'Mia', 'Oliver', 'Charlotte', 'Elijah', 'Amelia', 'James', 'Harper', 'Benjamin', 'Evelyn'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

  for (let i = 0; i < createdCustomers.length; i++) {
    const customer = createdCustomers[i];
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i + 3) % lastNames.length];
    const userEmail = `${fn.toLowerCase()}.${ln.toLowerCase()}@${customer.email.split('@')[1]}`;

    await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: {
        email: userEmail,
        passwordHash,
        name: `${fn} ${ln}`,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        company: customer.name,
        customerId: customer.id,
      },
    });
  }
  console.log(`✅ Generated Customer Portal Users: ${createdCustomers.length}`);

  // ── 7. Create Internal Employees (~35 employees across all roles) ──────────
  console.log('👔 Generating Internal Employees (Sales Reps, Managers, Finance, Admins)...');
  const employeeRoles = [
    // Sales Reps (18)
    { name: 'Sarah Jenkins', role: 'SALES_REP', email: 'sarah.jenkins@dealflow360.com' },
    { name: 'Arjun Mehta', role: 'SALES_REP', email: 'arjun.mehta@dealflow360.com' },
    { name: 'Elena Rostova', role: 'SALES_REP', email: 'elena.rostova@dealflow360.com' },
    { name: 'Marcus Vance', role: 'SALES_REP', email: 'marcus.vance@dealflow360.com' },
    { name: 'Priya Nair', role: 'SALES_REP', email: 'priya.nair@dealflow360.com' },
    { name: 'David Chen', role: 'SALES_REP', email: 'david.chen@dealflow360.com' },
    { name: 'Fatima Al-Mansoor', role: 'SALES_REP', email: 'fatima.mansoor@dealflow360.com' },
    { name: 'Mateo Morales', role: 'SALES_REP', email: 'mateo.morales@dealflow360.com' },
    { name: 'Aisha Bello', role: 'SALES_REP', email: 'aisha.bello@dealflow360.com' },
    { name: 'Lucas Lindqvist', role: 'SALES_REP', email: 'lucas.lindqvist@dealflow360.com' },
    { name: 'Rohan Sharma', role: 'SALES_REP', email: 'rohan.sharma@dealflow360.com' },
    { name: 'Chloe Dubois', role: 'SALES_REP', email: 'chloe.dubois@dealflow360.com' },
    { name: 'Tariq Al-Fassi', role: 'SALES_REP', email: 'tariq.fassi@dealflow360.com' },
    { name: 'Ananya Iyer', role: 'SALES_REP', email: 'ananya.iyer@dealflow360.com' },
    { name: 'Viktor Reznov', role: 'SALES_REP', email: 'viktor.reznov@dealflow360.com' },
    { name: 'Camila Santos', role: 'SALES_REP', email: 'camila.santos@dealflow360.com' },
    { name: 'Zane Gallagher', role: 'SALES_REP', email: 'zane.gallagher@dealflow360.com' },
    { name: 'Leila Tanaka', role: 'SALES_REP', email: 'leila.tanaka@dealflow360.com' },

    // Sales Managers (7)
    { name: 'Derek Sterling', role: 'SALES_MANAGER', email: 'derek.sterling@dealflow360.com' },
    { name: 'Nathalie Fournier', role: 'SALES_MANAGER', email: 'nathalie.fournier@dealflow360.com' },
    { name: 'Vikram Singhania', role: 'SALES_MANAGER', email: 'vikram.singhania@dealflow360.com' },
    { name: 'Rachel Goldberg', role: 'SALES_MANAGER', email: 'rachel.goldberg@dealflow360.com' },
    { name: 'Hassan Qureshi', role: 'SALES_MANAGER', email: 'hassan.qureshi@dealflow360.com' },
    { name: 'Ingrid Berg', role: 'SALES_MANAGER', email: 'ingrid.berg@dealflow360.com' },
    { name: 'Carlos Mendoza', role: 'SALES_MANAGER', email: 'carlos.mendoza@dealflow360.com' },

    // Finance & Operations (7)
    { name: 'Arthur Pendelton', role: 'FINANCE_OPERATIONS', email: 'arthur.pendelton@dealflow360.com' },
    { name: 'Sunita Deshmukh', role: 'FINANCE_OPERATIONS', email: 'sunita.deshmukh@dealflow360.com' },
    { name: 'Jean-Luc Picard', role: 'FINANCE_OPERATIONS', email: 'jeanluc.picard@dealflow360.com' },
    { name: 'Katarina Novak', role: 'FINANCE_OPERATIONS', email: 'katarina.novak@dealflow360.com' },
    { name: 'Samuel Osei', role: 'FINANCE_OPERATIONS', email: 'samuel.osei@dealflow360.com' },
    { name: 'Beatriz Silva', role: 'FINANCE_OPERATIONS', email: 'beatriz.silva@dealflow360.com' },
    { name: 'Hiroshi Sato', role: 'FINANCE_OPERATIONS', email: 'hiroshi.sato@dealflow360.com' },

    // Admins (3)
    { name: 'Claire Kensington', role: 'ADMIN', email: 'claire.kensington@dealflow360.com' },
    { name: 'Devon Armstrong', role: 'ADMIN', email: 'devon.armstrong@dealflow360.com' },
    { name: 'Maya Lin', role: 'ADMIN', email: 'maya.lin@dealflow360.com' },
  ];

  const createdEmployees = [];
  for (const emp of employeeRoles) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        passwordHash,
        name: emp.name,
        role: emp.role,
        status: 'ACTIVE',
        company: 'DealFlow360 HQ',
      },
    });
    createdEmployees.push(user);
  }
  console.log(`✅ Generated Internal Employees: ${createdEmployees.length}`);

  // ── 8. Create Quote Requests (~25 items) ───────────────────────────────────
  console.log('📋 Generating Customer Quote Requests...');
  const salesReps = createdEmployees.filter((e) => e.role === 'SALES_REP');
  const quoteReqStatuses = ['PENDING', 'PENDING', 'ACCEPTED', 'REJECTED'];

  for (let i = 0; i < 25; i++) {
    const cust = createdCustomers[i % createdCustomers.length];
    const rep = salesReps[i % salesReps.length];
    const prod = createdProducts[(i * 3) % createdProducts.length];
    const status = quoteReqStatuses[i % quoteReqStatuses.length];

    await prisma.quoteRequest.create({
      data: {
        customerId: cust.id,
        salesRepId: rep.id,
        productId: prod.id,
        quantity: (i % 5) + 2,
        notes: `Customer requesting enterprise bulk pricing discount evaluation for ${prod.name} (Quarterly deployment).`,
        status,
      },
    });
  }
  console.log('✅ Generated 25 Customer Quote Requests');

  console.log('🎉 Successfully finished generating all mock records into PostgreSQL!');
  console.log('🔑 All generated accounts use the password: Password123!');
}

generateData()
  .catch((e) => {
    console.error('❌ Data generation failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
