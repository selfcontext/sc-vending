import 'VendingServiceInterface.dart' show TcnVendSdk;

class VendingServiceStub implements TcnVendSdk {

  /// Initializes the SDK stub. Returns true on success.
  @override
  Future<bool> initializeSdk() async {
    print('#[STUB]###########');
    print('initializeSdk()');
    print('##################');
    return true;
  }

  /// Enables or disables drop sensor check stub.
  @override Future<void> setDropSensorCheck(bool enable) async {
    print('#[STUB]###########');
    print('setDropSensorCheck({enable: $enable})');
    print('##################');
  }

  /// Returns the current drop sensor check state stub.
  @override Future<bool> isDropSensorCheck() async {
    print('#[STUB]###########');
    print('isDropSensorCheck()');
    print('##################');
    return false;
  }

  /// Queries the status of a specific slot stub.
  @override Future<void> querySlotStatus(int slotNo) async {
    print('#[STUB]###########');
    print('querySlotStatus({slotNo: $slotNo})');
    print('##################');
  }

  /// Ships an item from a slot with given parameters stub.
  @override Future<void> ship({
    required int slotNo,
    required int shipMethod,
    required int amount,
    required String tradeNo,
  }) async {
    print('#[STUB]###########');
    print(
        'ship({slotNo: $slotNo, shipMethod: $shipMethod, amount: $amount, tradeNo: $tradeNo})');
    print('##################');
  }

  /// Performs a ship test on a specific slot stub.
  @override Future<void> shipTest(int slotNo) async {
    print('#[STUB]###########');
    print('shipTest({slotNo: $slotNo})');
    print('##################');
  }

  /// Selects a given slot stub.
  @override Future<void> selectSlot(int slotNo) async {
    print('#[STUB]###########');
    print('selectSlot({slotNo: $slotNo})');
    print('##################');
  }

  /// Resets the vending machine with the provided groupSpringId stub.
  @override Future<void> reset(String groupSpringId) async {
    print('#[STUB]###########');
    print('reset({groupSpringId: $groupSpringId})');
    print('##################');
  }

  /// Sets heating parameters for the spring stub.
  @override Future<void> setHeatSpring({
    required int temp,
    required int startTime,
    required int endTime,
  }) async {
    print('#[STUB]###########');
    print(
        'setHeatSpring({temp: $temp, startTime: $startTime, endTime: $endTime})');
    print('##################');
  }

  /// Enables or disables glass heat stub.
  @override Future<void> setGlassHeat(bool enable) async {
    print('#[STUB]###########');
    print('setGlassHeat({enable: $enable})');
    print('##################');
  }

  /// Turns the LED on or off stub.
  @override Future<void> setLedOpen(bool enable) async {
    print('#[STUB]###########');
    print('setLedOpen({enable: $enable})');
    print('##################');
  }

  /// Turns the buzzer on or off stub.
  @override Future<void> setBuzzerOpen(bool enable) async {
    print('#[STUB]###########');
    print('setBuzzerOpen({enable: $enable})');
    print('##################');
  }

  /// Sets a specific spring slot stub.
  @override Future<void> setSpringSlot(int slotNo) async {
    print('#[STUB]###########');
    print('setSpringSlot({slotNo: $slotNo})');
    print('##################');
  }

  /// Sets a specific belts slot stub.
  @override Future<void> setBeltsSlot(int slotNo) async {
    print('#[STUB]###########');
    print('setBeltsSlot({slotNo: $slotNo})');
    print('##################');
  }

  /// Activates all spring slots stub.
  @override Future<void> setSpringAllSlot() async {
    print('#[STUB]###########');
    print('setSpringAllSlot()');
    print('##################');
  }

  /// Activates all belts slots stub.
  @override Future<void> setBeltsAllSlot() async {
    print('#[STUB]###########');
    print('setBeltsAllSlot()');
    print('##################');
  }

  /// Activates a single slot mode stub.
  @override Future<void> setSingleSlot(int slotNo) async {
    print('#[STUB]###########');
    print('setSingleSlot({slotNo: $slotNo})');
    print('##################');
  }

  /// Activates a double slot mode stub.
  @override Future<void> setDoubleSlot(int slotNo) async {
    print('#[STUB]###########');
    print('setDoubleSlot({slotNo: $slotNo})');
    print('##################');
  }

  /// Activates single-slot mode for all slots stub.
  @override Future<void> setSingleAllSlot() async {
    print('#[STUB]###########');
    print('setSingleAllSlot()');
    print('##################');
  }

  /// Puts the machine into test mode stub.
  @override Future<void> testMode() async {
    print('#[STUB]###########');
    print('testMode()');
    print('##################');
  }
}