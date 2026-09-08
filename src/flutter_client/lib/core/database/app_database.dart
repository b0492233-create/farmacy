import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'app_database.g.dart';

// Local Offline Products Table
class LocalProducts extends Table {
  TextColumn get id => text()();
  TextColumn get nameAr => text()();
  TextColumn get nameEn => text().nullable()();
  TextColumn get barcode => text()();
  TextColumn get internalCode => text()();
  TextColumn get sku => text().nullable()();
  TextColumn get categoryId => text()();
  TextColumn get companyId => text()();
  TextColumn get activeIngredient => text().nullable()();
  TextColumn get unit => text().withDefault(const Constant('علبة'))();
  RealColumn get purchasePrice => real()();
  RealColumn get salePrice => real()();
  IntColumn get minimumStock => integer().withDefault(const Constant(5))();
  RealColumn get taxRate => real().withDefault(const Constant(0.0))();
  BoolColumn get requiresPrescription => boolean().withDefault(const Constant(false))();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

// Local Batches Table
class LocalBatches extends Table {
  TextColumn get id => text()();
  TextColumn get productId => text()();
  TextColumn get batchNumber => text()();
  DateTimeColumn get expiryDate => dateTime()();
  RealColumn get purchasePrice => real()();
  RealColumn get salePrice => real()();
  RealColumn get quantity => real()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

// Local Sync Queue (Guarantees no data loss when offline)
class LocalSyncQueue extends Table {
  TextColumn get id => text()();
  TextColumn get operationId => text()();
  TextColumn get entityName => text()();
  TextColumn get entityId => text()();
  TextColumn get action => text()(); // INSERT, UPDATE, DELETE
  TextColumn get payloadJson => text()();
  TextColumn get deviceId => text()();
  TextColumn get status => text().withDefault(const Constant('pending'))();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get idempotencyKey => text()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [LocalProducts, LocalBatches, LocalSyncQueue])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  static LazyDatabase _openConnection() {
    return LazyDatabase(() async {
      final dbFolder = await getApplicationDocumentsDirectory();
      final file = File(p.join(dbFolder.path, 'pharmacy_offline_v2.sqlite'));
      return NativeDatabase.createInBackground(file);
    });
  }
}
