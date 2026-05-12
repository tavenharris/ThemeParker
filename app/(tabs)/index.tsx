import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WDW_PARKS, fetchWaitTimes, RideWaitTime, Park } from '../../src/api';
import { usePlan } from '../../src/PlanContext';
import { Ionicons } from '@expo/vector-icons';

export default function WaitTimesScreen() {
  const [selectedPark, setSelectedPark] = useState<Park>(WDW_PARKS[0]);
  const [waitTimes, setWaitTimes] = useState<RideWaitTime[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { addRide, isPlanned, removeRide } = usePlan();

  useEffect(() => {
    loadWaitTimes();
  }, [selectedPark]);

  const loadWaitTimes = async () => {
    setLoading(true);
    const data = await fetchWaitTimes(selectedPark.id);
    setWaitTimes(data.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  };

  const renderWaitTime = ({ item }: { item: RideWaitTime }) => {
    const planned = isPlanned(item.id);
    const waitTimeText = item.status === 'OPERATING' && item.queue?.STANDBY?.waitTime !== undefined
      ? `${item.queue.STANDBY.waitTime} min`
      : item.status;

    return (
      <View style={styles.rideCard}>
        <View style={styles.rideInfo}>
          <Text style={styles.rideName}>{item.name}</Text>
          <Text style={styles.waitTime}>Wait: {waitTimeText}</Text>
        </View>
        <TouchableOpacity
          style={styles.planButton}
          onPress={() => planned ? removeRide(item.id) : addRide(item)}
        >
          <Ionicons name={planned ? 'checkmark-circle' : 'add-circle-outline'} size={32} color={planned ? '#34C759' : '#007AFF'} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.parkSelector}>
        <FlatList
          horizontal
          data={WDW_PARKS}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.parkTab, selectedPark.id === item.id && styles.parkTabActive]}
              onPress={() => setSelectedPark(item)}
            >
              <Text style={[styles.parkTabText, selectedPark.id === item.id && styles.parkTabTextActive]}>
                {item.name.replace("Disney's ", "").replace(" Park", "").replace(" Theme Park", "")}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={waitTimes}
          keyExtractor={(item) => item.id}
          renderItem={renderWaitTime}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadWaitTimes}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  parkSelector: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  parkTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
  },
  parkTabActive: {
    backgroundColor: '#007AFF',
  },
  parkTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  parkTabTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: 16,
  },
  rideCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rideInfo: {
    flex: 1,
    paddingRight: 10,
  },
  rideName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  waitTime: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
  },
  planButton: {
    padding: 4,
  },
});
