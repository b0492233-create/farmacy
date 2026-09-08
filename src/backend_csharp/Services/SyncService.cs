using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PharmacyManagementSystem.Api.Data;
using PharmacyManagementSystem.Api.Models;

namespace PharmacyManagementSystem.Api.Services
{
    public record SyncPushBatchItem(
        string OperationId,
        string IdempotencyKey,
        string Entity,
        string EntityId,
        string Action,
        string PayloadJson,
        string DeviceId,
        Guid UserId,
        DateTime CreatedAt
    );

    public record SyncPushRequest(
        string DeviceId,
        Guid BranchId,
        List<SyncPushBatchItem> Items
    );

    public record SyncPushResponse(
        int ProcessedCount,
        int DuplicateCount,
        int ConflictCount,
        List<string> SyncedOperationIds
    );

    public interface ISyncService
    {
        Task<SyncPushResponse> ProcessSyncBatchAsync(SyncPushRequest request);
    }

    public class SyncService : ISyncService
    {
        private readonly PharmacyDbContext _db;

        public SyncService(PharmacyDbContext db)
        {
            _db = db;
        }

        public async Task<SyncPushResponse> ProcessSyncBatchAsync(SyncPushRequest request)
        {
            var syncedIds = new List<string>();
            int processed = 0;
            int duplicates = 0;
            int conflicts = 0;

            foreach (var item in request.Items)
            {
                // 1. Check idempotency: Have we already processed this exact offline operation?
                var exists = await _db.SyncQueue.AnyAsync(q => q.IdempotencyKey == item.IdempotencyKey);
                if (exists)
                {
                    duplicates++;
                    syncedIds.Add(item.OperationId);
                    continue;
                }

                // 2. Record in sync_queue
                var queueItem = new SyncQueueItemRecord
                {
                    Id = Guid.NewGuid(),
                    OperationId = item.OperationId,
                    IdempotencyKey = item.IdempotencyKey,
                    Entity = item.Entity,
                    EntityId = item.EntityId,
                    Action = item.Action,
                    PayloadJson = item.PayloadJson,
                    DeviceId = item.DeviceId,
                    UserId = item.UserId,
                    CreatedAt = item.CreatedAt,
                    SyncedAt = DateTime.UtcNow,
                    Status = "synced"
                };

                _db.SyncQueue.Add(queueItem);

                // Apply operation if needed (e.g. POS sale from offline)
                if (item.Entity == "sale" && item.Action == "INSERT")
                {
                    // Sale record payload can be deserialized and verified
                }

                syncedIds.Add(item.OperationId);
                processed++;
            }

            await _db.SaveChangesAsync();

            return new SyncPushResponse(processed, duplicates, conflicts, syncedIds);
        }
    }
}
