
/*

DO NOT USE THIS ONE FOR NOW

*/


import 'package:flutter/services.dart';

import 'VendingServiceInterface.dart' show TcnVendSdk;

class Vendingservice  implements TcnVendSdk {
  static const MethodChannel _channel = MethodChannel('com.cubeworks.vending/sdk');

  /// Initializes the SDK. Returns true on success.
  @override Future<bool> initializeSdk() async {
    final bool result = await _channel.invokeMethod('initializeSdk');
    return result;
  }

  /// Enables or disables drop sensor check.
  @override Future<void> setDropSensorCheck(bool enable) async {
    await _channel.invokeMethod('setDropSensorCheck', {
      'enable': enable,
    });
  }

  /// Returns the current drop sensor check state.
  @override Future<bool> isDropSensorCheck() async {
    final bool result = await _channel.invokeMethod('isDropSensorCheck');
    return result;
  }

  /// Queries the status of a specific slot.
  @override Future<void> querySlotStatus(int slotNo) async {
    await _channel.invokeMethod('querySlotStatus', {
      'slotNo': slotNo,
    });
  }

  /// Ships an item from a slot with given parameters.
  @override Future<void> ship({
    required int slotNo,
    required int shipMethod,
    required int amount,
    required String tradeNo,
  }) async {
    await _channel.invokeMethod('ship', {
      'slotNo': slotNo,
      'shipMethod': shipMethod,
      'amount': amount,
      'tradeNo': tradeNo,
    });
  }

  /// Performs a ship test on a specific slot.
  @override Future<void> shipTest(int slotNo) async {
    await _channel.invokeMethod('shipTest', {
      'slotNo': slotNo,
    });
  }

  /// Selects a given slot.
  @override Future<void> selectSlot(int slotNo) async {
    await _channel.invokeMethod('selectSlot', {
      'slotNo': slotNo,
    });
  }

  /// Resets the vending machine with the provided groupSpringId.
  @override Future<void> reset(String groupSpringId) async {
    await _channel.invokeMethod('reset', {
      'groupSpringId': groupSpringId,
    });
  }

  /// Sets heating parameters for the spring (temp in °C, startTime and endTime in seconds).
  @override Future<void> setHeatSpring({
    required int temp,
    required int startTime,
    required int endTime,
  }) async {
    await _channel.invokeMethod('setHeatSpring', {
      'temp': temp,
      'startTime': startTime,
      'endTime': endTime,
    });
  }

  /// Enables or disables glass heat.
  @override Future<void> setGlassHeat(bool enable) async {
    await _channel.invokeMethod('setGlassHeat', {
      'enable': enable,
    });
  }

  /// Turns the LED on or off.
  @override Future<void> setLedOpen(bool enable) async {
    await _channel.invokeMethod('setLedOpen', {
      'enable': enable,
    });
  }

  /// Turns the buzzer on or off.
  @override Future<void> setBuzzerOpen(bool enable) async {
    await _channel.invokeMethod('setBuzzerOpen', {
      'enable': enable,
    });
  }

  /// Sets a specific spring slot.
  @override Future<void> setSpringSlot(int slotNo) async {
    await _channel.invokeMethod('setSpringSlot', {
      'slotNo': slotNo,
    });
  }

  /// Sets a specific belts slot.
  @override Future<void> setBeltsSlot(int slotNo) async {
    await _channel.invokeMethod('setBeltsSlot', {
      'slotNo': slotNo,
    });
  }

  /// Activates all spring slots.
  @override Future<void> setSpringAllSlot() async {
    await _channel.invokeMethod('setSpringAllSlot');
  }

  /// Activates all belts slots.
  @override Future<void> setBeltsAllSlot() async {
    await _channel.invokeMethod('setBeltsAllSlot');
  }

  /// Activates a single slot mode.
  @override Future<void> setSingleSlot(int slotNo) async {
    await _channel.invokeMethod('setSingleSlot', {
      'slotNo': slotNo,
    });
  }

  /// Activates a double slot mode.
  @override Future<void> setDoubleSlot(int slotNo) async {
    await _channel.invokeMethod('setDoubleSlot', {
      'slotNo': slotNo,
    });
  }

  /// Activates single-slot mode for all slots.
  @override Future<void> setSingleAllSlot() async {
    await _channel.invokeMethod('setSingleAllSlot');
  }

  /// Puts the machine into test mode.
  @override Future<void> testMode() async {
    await _channel.invokeMethod('testMode');
  }
}