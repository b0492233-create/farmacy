using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PharmacyManagementSystem.Api.Models
{
    [Table("branches")]
    public class Branch
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(200)]
        public string NameAr { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? NameEn { get; set; }

        [Required, MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [MaxLength(300)]
        public string Address { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Phone { get; set; } = string.Empty;

        public bool IsMain { get; set; } = false;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("users")]
    public class User
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required, MaxLength(200)]
        public string FullNameAr { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [MaxLength(10)]
        public string? QuickPin { get; set; } // Quick 4-6 digit PIN for fast cashier POS switching

        [Required, MaxLength(50)]
        public string Role { get; set; } = "cashier"; // admin, manager, pharmacist, cashier, accountant

        public Guid? BranchId { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime? LastLoginAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("categories")]
    public class Category
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(150)]
        public string NameAr { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? NameEn { get; set; }

        [MaxLength(50)]
        public string? Code { get; set; }
    }

    [Table("companies")]
    public class Company
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(200)]
        public string NameAr { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? NameEn { get; set; }
    }

    [Table("products")]
    public class Product
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(250)]
        public string NameAr { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? NameEn { get; set; }

        [Required, MaxLength(100)]
        public string Barcode { get; set; } = string.Empty;

        public List<string>? AdditionalBarcodes { get; set; }

        [Required, MaxLength(50)]
        public string InternalCode { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Sku { get; set; } = string.Empty;

        public Guid CategoryId { get; set; }
        public Guid CompanyId { get; set; }

        [MaxLength(250)]
        public string ActiveIngredient { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Unit { get; set; } = "علبة";

        [Column(TypeName = "decimal(18,2)")]
        public decimal PurchasePrice { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal SalePrice { get; set; }

        public int MinimumStock { get; set; } = 5;

        [Column(TypeName = "decimal(5,2)")]
        public decimal TaxRate { get; set; } = 0m; // Medicines in Egypt are usually 0%

        public bool RequiresPrescription { get; set; } = false;
        public string Status { get; set; } = "active";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public virtual ICollection<Batch> Batches { get; set; } = new List<Batch>();
    }

    [Table("batches")]
    public class Batch
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid ProductId { get; set; }

        [Required, MaxLength(100)]
        public string BatchNumber { get; set; } = string.Empty;

        public DateTime ExpiryDate { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal PurchasePrice { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal SalePrice { get; set; }

        public int Quantity { get; set; }
        public Guid BranchId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        [ForeignKey("ProductId")]
        public virtual Product? Product { get; set; }
    }

    [Table("sales")]
    public class Sale
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(50)]
        public string InvoiceNumber { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string IdempotencyKey { get; set; } = string.Empty;

        public Guid BranchId { get; set; }
        public Guid UserId { get; set; }
        public Guid? CustomerId { get; set; }
        public Guid? ShiftId { get; set; }

        [MaxLength(50)]
        public string DeviceId { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Subtotal { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Discount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Tax { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Total { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal PaidAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ChangeAmount { get; set; }

        [Required, MaxLength(50)]
        public string PaymentMethod { get; set; } = "cash"; // cash, card, credit, vodafone_cash, instapay

        [Required, MaxLength(50)]
        public string Status { get; set; } = "completed"; // completed, returned, partial_returned

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public virtual ICollection<SaleItem> Items { get; set; } = new List<SaleItem>();
    }

    [Table("sale_items")]
    public class SaleItem
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid SaleId { get; set; }
        public Guid ProductId { get; set; }
        public Guid BatchId { get; set; }

        public int Quantity { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Discount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Tax { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Total { get; set; }

        [ForeignKey("SaleId")]
        public virtual Sale? Sale { get; set; }
    }

    [Table("sync_queue")]
    public class SyncQueueItemRecord
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(100)]
        public string OperationId { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string IdempotencyKey { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string Entity { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string EntityId { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string Action { get; set; } = string.Empty; // INSERT, UPDATE, DELETE

        [Required]
        public string PayloadJson { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string DeviceId { get; set; } = string.Empty;

        public Guid UserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? SyncedAt { get; set; }

        [Required, MaxLength(30)]
        public string Status { get; set; } = "pending"; // pending, synced, conflict, rejected
    }
}
