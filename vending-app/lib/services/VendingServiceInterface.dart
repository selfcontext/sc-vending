
/// Common interface for both the real JNI/MethodChannel implementation
/// and the pure-Dart stub used in unit / UI tests.
abstract class TcnVendSdk {
  Future<bool> initializeSdk();

  Future<void> setDropSensorCheck(bool enable);
  Future<bool> isDropSensorCheck();

  Future<void> querySlotStatus(int slotNo);

  Future<void> ship({
    required int slotNo,
    required int shipMethod,
    required int amount,
    required String tradeNo,
  });

  Future<void> shipTest(int slotNo);
  Future<void> selectSlot(int slotNo);
  Future<void> reset(String groupSpringId);

  Future<void> setHeatSpring({
    required int temp,
    required int startTime,
    required int endTime,
  });

  Future<void> setGlassHeat(bool enable);
  Future<void> setLedOpen(bool enable);
  Future<void> setBuzzerOpen(bool enable);

  Future<void> setSpringSlot(int slotNo);
  Future<void> setBeltsSlot(int slotNo);

  Future<void> setSpringAllSlot();
  Future<void> setBeltsAllSlot();

  Future<void> setSingleSlot(int slotNo);
  Future<void> setDoubleSlot(int slotNo);

  Future<void> setSingleAllSlot();
  Future<void> testMode();
}