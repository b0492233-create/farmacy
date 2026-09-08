using Microsoft.EntityFrameworkCore;
using PharmacyManagementSystem.Api.Models;

namespace PharmacyManagementSystem.Api.Data
{
    public class PharmacyDbContext : DbContext
    {
        public PharmacyDbContext(DbContextOptions<PharmacyDbContext> options) : base(options)
        {
        }

        public DbSet<Branch> Branches => Set<Branch>();
        public DbSet<User> Users => Set<User>();
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<Company> Companies => Set<Company>();
        public DbSet<Product> Products => Set<Product>();
        public DbSet<Batch> Batches => Set<Batch>();
        public DbSet<Sale> Sales => Set<Sale>();
        public DbSet<SaleItem> SaleItems => Set<SaleItem>();
        public DbSet<SyncQueueItemRecord> SyncQueue => Set<SyncQueueItemRecord>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Barcode index
            modelBuilder.Entity<Product>()
                .HasIndex(p => p.Barcode)
                .IsUnique();

            modelBuilder.Entity<Product>()
                .HasIndex(p => p.InternalCode)
                .IsUnique();

            // Sale Idempotency Key unique index to prevent duplicate billing
            modelBuilder.Entity<Sale>()
                .HasIndex(s => s.IdempotencyKey)
                .IsUnique();

            modelBuilder.Entity<Sale>()
                .HasIndex(s => s.InvoiceNumber)
                .IsUnique();

            // Sync Queue Idempotency Key
            modelBuilder.Entity<SyncQueueItemRecord>()
                .HasIndex(q => q.IdempotencyKey)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();
        }
    }
}
