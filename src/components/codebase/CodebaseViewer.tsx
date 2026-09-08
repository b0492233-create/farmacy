import React, { useState } from 'react';
import {
  FileCode, Database, Smartphone, Server, Copy,
  CheckCircle2, Download, Layers, Shield
} from 'lucide-react';

export const CodebaseViewer: React.FC = () => {
  const [activeFile, setActiveFile] = useState<'PROGRAM_CS' | 'CONTROLLER_CS' | 'DRUG_EYE_CS' | 'POSTGRES_SQL' | 'FLUTTER_DART'>('PROGRAM_CS');
  const [copied, setCopied] = useState(false);

  const files = {
    PROGRAM_CS: {
      title: 'ASP.NET Core Web API - Program.cs',
      lang: 'csharp',
      desc: 'إعداد الـ Web API، JWT Auth، PostgreSQL DbContext، وCORS مع دعم Network Bind 0.0.0.0',
      code: `using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PharmacyApi.Data;
using PharmacyApi.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Add PostgreSQL Database Context (Npgsql)
builder.Services.AddDbContext<PharmacyDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PharmacyDb") 
    ?? "Host=localhost;Database=pharmacy_production;Username=postgres;Password=your_strong_password"));

// 2. JWT Authentication & Role-Based Access Control (RBAC)
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SUPER_SECRET_PRODUCTION_KEY_FOR_PHARMACY_MANAGEMENT_SYSTEM_2026";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "PharmacyApi",
            ValidAudience = "PharmacyClients",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 3. CORS Policy for Windows, Android, and Web Clients
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAllOrigins", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAllOrigins");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Listen on all network interfaces for LAN / Local Server access
app.Run("http://0.0.0.0:5000");`,
    },

    CONTROLLER_CS: {
      title: 'ASP.NET Core Controller - ProductsController.cs',
      lang: 'csharp',
      desc: 'API Controller لإدارة الأدوية، البحث بالباركود، التحقق من المخزون، والـ FEFO Batches',
      code: `using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.Models;

namespace PharmacyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly PharmacyDbContext _db;

    public ProductsController(PharmacyDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts([FromQuery] string? search)
    {
        var query = _db.Products
            .Include(p => p.Batches)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLower();
            query = query.Where(p => 
                p.NameAr.ToLower().Contains(q) || 
                p.Barcode.Contains(q) || 
                p.ActiveIngredient.ToLower().Contains(q));
        }

        var products = await query.ToListAsync();
        return Ok(products);
    }

    [HttpGet("barcode/{barcode}")]
    public async Task<IActionResult> GetByBarcode(string barcode)
    {
        var product = await _db.Products
            .Include(p => p.Batches)
            .FirstOrDefaultAsync(p => p.Barcode == barcode);

        if (product == null)
            return NotFound(new { message = "الصنف غير مسجل بالنظام" });

        return Ok(product);
    }

    [HttpPost]
    [Authorize(Roles = "admin,pharmacist")]
    public async Task<IActionResult> CreateProduct([FromBody] Product product)
    {
        if (await _db.Products.AnyAsync(p => p.Barcode == product.Barcode))
            return BadRequest(new { message = "الباركود مسجل مسبقاً لصنف آخر" });

        product.CreatedAt = DateTime.UtcNow;
        product.UpdatedAt = DateTime.UtcNow;

        _db.Products.Add(product);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetByBarcode), new { barcode = product.Barcode }, product);
    }
}`,
    },

    DRUG_EYE_CS: {
      title: 'ASP.NET Core Web API - DrugEyeSyncController.cs',
      lang: 'csharp',
      desc: 'خدمة مزامنة أسعار هيئة الدواء (EDA) عبر Drug Eye API وتحديث الباتشات في PostgreSQL',
      code: `using System.Net.Http.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;

namespace PharmacyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DrugEyeSyncController : ControllerBase
{
    private readonly PharmacyDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<DrugEyeSyncController> _logger;

    public DrugEyeSyncController(
        PharmacyDbContext db, 
        IHttpClientFactory httpClientFactory,
        ILogger<DrugEyeSyncController> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    [HttpGet("check-updates")]
    public async Task<IActionResult> CheckPriceUpdates()
    {
        var client = _httpClientFactory.CreateClient("DrugEyeClient");
        
        // Fetch official price catalog from Drug Eye Cloud
        var response = await client.GetFromJsonAsync<List<DrugEyeMedicineDto>>("v1/medicines/latest-prices");
        if (response == null) return StatusCode(502, new { message = "Drug Eye service unreachable" });

        var barcodes = response.Select(d => d.Barcode).ToList();
        var localProducts = await _db.Products
            .Where(p => barcodes.Contains(p.Barcode))
            .ToListAsync();

        var updates = (from local in localProducts
                       join cloud in response on local.Barcode equals cloud.Barcode
                       where cloud.OfficialPrice != local.SalePrice
                       select new
                       {
                           ProductId = local.Id,
                           local.NameAr,
                           local.Barcode,
                           CurrentPrice = local.SalePrice,
                           OfficialPrice = cloud.OfficialPrice,
                           PriceDifference = cloud.OfficialPrice - local.SalePrice,
                           cloud.EdaBulletinNo,
                           cloud.LastPriceChangeDate
                       }).ToList();

        return Ok(new { count = updates.Count, updates });
    }

    [HttpPost("apply-price-updates")]
    [Authorize(Roles = "admin,pharmacist")]
    public async Task<IActionResult> ApplyPriceUpdates([FromBody] List<Guid> productIds)
    {
        using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var client = _httpClientFactory.CreateClient("DrugEyeClient");
            var cloudPrices = await client.GetFromJsonAsync<List<DrugEyeMedicineDto>>("v1/medicines/latest-prices");
            var priceDict = cloudPrices!.ToDictionary(c => c.Barcode, c => c.OfficialPrice);

            var productsToUpdate = await _db.Products
                .Include(p => p.Batches)
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync();

            foreach (var product in productsToUpdate)
            {
                if (priceDict.TryGetValue(product.Barcode, out var newOfficialPrice))
                {
                    var oldPrice = product.SalePrice;
                    product.SalePrice = newOfficialPrice;
                    product.UpdatedAt = DateTime.UtcNow;

                    // Also sync selling price across all active in-stock batches
                    foreach (var batch in product.Batches.Where(b => b.Quantity > 0))
                    {
                        batch.SalePrice = newOfficialPrice;
                    }

                    _db.AuditLogs.Add(new AuditLog
                    {
                        Id = Guid.NewGuid(),
                        Action = "DRUG_EYE_PRICE_UPDATE",
                        Details = $"تحديث سعر {product.NameAr} من {oldPrice} ج.م إلى {newOfficialPrice} ج.م عبر Drug Eye",
                        Timestamp = DateTime.UtcNow,
                        UserId = User.FindFirst("sub")?.Value
                    });
                }
            }

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new { success = true, updatedCount = productsToUpdate.Count });
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Failed to apply Drug Eye price updates");
            return StatusCode(500, new { message = "فشل في تحديث الأسعار بقاعدة البيانات" });
        }
    }
}

public record DrugEyeMedicineDto(string Barcode, string TradeNameAr, decimal OfficialPrice, string EdaBulletinNo, DateTime LastPriceChangeDate);`,
    },

    POSTGRES_SQL: {
      title: 'PostgreSQL Production Schema (DDL)',
      lang: 'sql',
      desc: 'جداول الفروع، المستخدمين، الأدوية، الباتشات، المبيعات، الحركات المخزنية، وطابور المزامنة',
      code: `-- Production PostgreSQL Schema for Pharmacy Management System
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Branches
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150),
    phone VARCHAR(30),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users & Roles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    username VARCHAR(60) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pin_code VARCHAR(10),
    role VARCHAR(30) NOT NULL, -- admin, pharmacist, cashier, inventory_manager
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode VARCHAR(60) UNIQUE NOT NULL,
    internal_code VARCHAR(60) UNIQUE,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    active_ingredient TEXT,
    category VARCHAR(100),
    unit VARCHAR(30) DEFAULT 'علبة',
    purchase_price NUMERIC(12, 2) NOT NULL,
    sale_price NUMERIC(12, 2) NOT NULL,
    min_stock_alert INT DEFAULT 5,
    max_stock_alert INT DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Batches (FEFO Tracking)
CREATE TABLE product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(60) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    purchase_price NUMERIC(12, 2) NOT NULL,
    sale_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Invoices
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    device_id VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    invoice_number VARCHAR(60) UNIQUE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0,
    tax NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL,
    paid NUMERIC(12, 2) NOT NULL,
    change NUMERIC(12, 2) DEFAULT 0,
    payment_method VARCHAR(30) NOT NULL, -- cash, card, credit
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`,
    },

    FLUTTER_DART: {
      title: 'Flutter + Drift Local Database - app_database.dart',
      lang: 'dart',
      desc: 'قاعدة بيانات SQLite محلية للأجهزة المحمولة والديسكتوب للعمل دون إنترنت (Offline First)',
      code: `import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'app_database.g.dart';

// Local Products Table in SQLite
class LocalProducts extends Table {
  TextColumn get id => text()();
  TextColumn get barcode => text()();
  TextColumn get nameAr => text()();
  TextColumn get activeIngredient => text().nullable()();
  RealColumn get purchasePrice => real()();
  RealColumn get salePrice => real()();
  IntColumn get totalQuantity => integer().withDefault(const Constant(0))();
  TextColumn get unit => text().withDefault(const Constant('علبة'))();
  IntColumn get syncStatus => integer().withDefault(const Constant(1))();

  @override
  Set<Column> get primaryKey => {id};
}

// Local Batches Table
class LocalBatches extends Table {
  TextColumn get id => text()();
  TextColumn get productId => text()();
  TextColumn get batchNumber => text()();
  DateTimeColumn get expiryDate => dateTime()();
  IntColumn get quantity => integer()();
  RealColumn get salePrice => real()();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [LocalProducts, LocalBatches])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'pharmacy_local.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}`,
    },
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(files[activeFile].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              معمارية وأكواد المشروع (Production Architecture & Codebase)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
              Full-Stack Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            استعراض ملفات الـ ASP.NET Core C# API، ومخطط PostgreSQL، وقاعدة بيانات Drift SQLite لـ Flutter.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'تم النسخ للحافظة' : 'نسخ الكود'}</span>
        </button>
      </div>

      {/* Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          onClick={() => setActiveFile('PROGRAM_CS')}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
            activeFile === 'PROGRAM_CS'
              ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="font-bold text-xs text-slate-800">C# Program.cs</div>
          <div className="text-[10px] text-slate-500">خادم ASP.NET Core</div>
        </button>

        <button
          onClick={() => setActiveFile('CONTROLLER_CS')}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
            activeFile === 'CONTROLLER_CS'
              ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="font-bold text-xs text-slate-800">C# ProductsController</div>
          <div className="text-[10px] text-slate-500">REST API & Endpoints</div>
        </button>

        <button
          onClick={() => setActiveFile('DRUG_EYE_CS')}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
            activeFile === 'DRUG_EYE_CS'
              ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="font-bold text-xs text-indigo-700">C# DrugEyeSync</div>
          <div className="text-[10px] text-indigo-500">تحديث أسعار EDA سحابياً</div>
        </button>

        <button
          onClick={() => setActiveFile('POSTGRES_SQL')}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
            activeFile === 'POSTGRES_SQL'
              ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="font-bold text-xs text-slate-800">PostgreSQL Schema</div>
          <div className="text-[10px] text-slate-500">قاعدة البيانات الرئيسية</div>
        </button>

        <button
          onClick={() => setActiveFile('FLUTTER_DART')}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
            activeFile === 'FLUTTER_DART'
              ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="font-bold text-xs text-slate-800">Flutter Drift SQLite</div>
          <div className="text-[10px] text-slate-500">تخزين Offline للأجهزة</div>
        </button>
      </div>

      {/* Code Display */}
      <div className="bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-800 text-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <div className="font-bold text-sm text-indigo-400 font-mono">
              {files[activeFile].title}
            </div>
            <div className="text-xs text-slate-400">
              {files[activeFile].desc}
            </div>
          </div>
        </div>

        <pre className="p-4 bg-slate-950/80 rounded-xl overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed max-h-[60vh]" dir="ltr">
          {files[activeFile].code}
        </pre>
      </div>
    </div>
  );
};
