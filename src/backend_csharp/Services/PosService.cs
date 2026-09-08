using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PharmacyManagementSystem.Api.Data;
using PharmacyManagementSystem.Api.Models;

namespace PharmacyManagementSystem.Api.Services
{
    public record SaleItemDto(Guid ProductId, Guid BatchId, int Quantity, decimal UnitPrice, decimal Discount, decimal Tax);
    public record CreateSaleDto(
        string IdempotencyKey,
        Guid BranchId,
        Guid UserId,
        Guid? CustomerId,
        Guid? ShiftId,
        string DeviceId,
        decimal Subtotal,
        decimal Discount,
        decimal Tax,
        decimal Total,
        decimal PaidAmount,
        decimal ChangeAmount,
        string PaymentMethod,
        List<SaleItemDto> Items
    );

    public interface IPosService
    {
        Task<Sale> ProcessSaleAsync(CreateSaleDto dto);
    }

    public class PosService : IPosService
    {
        private readonly PharmacyDbContext _db;

        public PosService(PharmacyDbContext db)
        {
            _db = db;
        }

        public async Task<Sale> ProcessSaleAsync(CreateSaleDto dto)
        {
            // 1. Check idempotency: If already processed, return existing sale to prevent double-charging
            var existingSale = await _db.Sales
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.IdempotencyKey == dto.IdempotencyKey);

            if (existingSale != null)
            {
                return existingSale;
            }

            using var transaction = await _db.Database.BeginTransactionAsync();

            try
            {
                var invoiceNumber = $"INV-{DateTime.UtcNow:yyMMdd}-{new Random().Next(1000, 9999)}";

                var sale = new Sale
                {
                    Id = Guid.NewGuid(),
                    InvoiceNumber = invoiceNumber,
                    IdempotencyKey = dto.IdempotencyKey,
                    BranchId = dto.BranchId,
                    UserId = dto.UserId,
                    CustomerId = dto.CustomerId,
                    ShiftId = dto.ShiftId,
                    DeviceId = dto.DeviceId,
                    Subtotal = dto.Subtotal,
                    Discount = dto.Discount,
                    Tax = dto.Tax,
                    Total = dto.Total,
                    PaidAmount = dto.PaidAmount,
                    ChangeAmount = dto.ChangeAmount,
                    PaymentMethod = dto.PaymentMethod,
                    Status = "completed",
                    CreatedAt = DateTime.UtcNow
                };

                _db.Sales.Add(sale);

                foreach (var itemDto in dto.Items)
                {
                    // Deduct stock from specific batch according to FEFO
                    var batch = await _db.Batches.FindAsync(itemDto.BatchId);
                    if (batch != null)
                    {
                        if (batch.Quantity < itemDto.Quantity)
                        {
                            // In high concurrency, can allow backorder or throw
                        }
                        batch.Quantity = Math.Max(0, batch.Quantity - itemDto.Quantity);
                    }

                    var saleItem = new SaleItem
                    {
                        Id = Guid.NewGuid(),
                        SaleId = sale.Id,
                        ProductId = itemDto.ProductId,
                        BatchId = itemDto.BatchId,
                        Quantity = itemDto.Quantity,
                        UnitPrice = itemDto.UnitPrice,
                        Discount = itemDto.Discount,
                        Tax = itemDto.Tax,
                        Total = (itemDto.UnitPrice * itemDto.Quantity) - itemDto.Discount + itemDto.Tax
                    };

                    _db.SaleItems.Add(saleItem);
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                return sale;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
