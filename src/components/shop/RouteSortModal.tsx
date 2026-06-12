import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, Modal, TouchableOpacity, PanResponder,
    StyleSheet, ScrollView
} from 'react-native';
import AnimatedReanimated, { LinearTransition, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RouteSortModalProps {
    visible: boolean;
    onClose: () => void;
    orderLines: any[];
    onOrderChange: (newOrderLines: any[]) => void;
}

export const RouteSortModal: React.FC<RouteSortModalProps> = ({
    visible,
    onClose,
    orderLines,
    onOrderChange
}) => {
    const [localOrderLines, setLocalOrderLines] = useState<any[]>(orderLines);
    const [draggingId, setDraggingId] = useState<number | null>(null);
    
    const dragStartIndex = useRef<number>(-1);
    const dragCurrentIndex = useRef<number>(-1);

    // Sync with parent prop when visible changes
    useEffect(() => {
        if (visible) {
            setLocalOrderLines(orderLines);
        }
    }, [visible, orderLines]);

    // Keep references to values for gesture handlers to avoid stale state closures
    const stateRef = useRef({
        localOrderLines,
        draggingId
    });

    useEffect(() => {
        stateRef.current.localOrderLines = localOrderLines;
        stateRef.current.draggingId = draggingId;
    }, [localOrderLines, draggingId]);

    const handleSave = async () => {
        // Commit change to parent instantly
        onOrderChange(localOrderLines);

        // Close modal instantly
        onClose();

        // Perform background storage persistence
        try {
            const orderIds = localOrderLines.map(ol => ol.id);
            await AsyncStorage.setItem('customOrderLineSort', JSON.stringify(orderIds));
        } catch (e) {
            console.error('Failed to save custom tab order:', e);
        }
    };

    // We define a wrapper component for each item that mounts its own PanResponder
    const DraggableItem = ({ item, index }: { item: any, index: number }) => {
        const isDragging = draggingId === item.id;
        const dragY = useSharedValue(0);

        const panResponder = useRef(
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: () => true,
                onPanResponderGrant: () => {
                    setDraggingId(item.id);
                    dragStartIndex.current = index;
                    dragCurrentIndex.current = index;
                    dragY.value = 0;
                },
                onPanResponderMove: (evt, gestureState) => {
                    dragY.value = gestureState.dy;

                    const startIndex = dragStartIndex.current;
                    const currentIndex = dragCurrentIndex.current;
                    if (startIndex === -1 || currentIndex === -1) return;

                    const ITEM_HEIGHT = 76; // Card height (64) + spacing (12)
                    const offsetIndex = Math.round(gestureState.dy / ITEM_HEIGHT);
                    let targetIndex = startIndex + offsetIndex;
                    targetIndex = Math.max(0, Math.min(stateRef.current.localOrderLines.length - 1, targetIndex));

                    if (targetIndex !== currentIndex) {
                        const newOrder = [...stateRef.current.localOrderLines];
                        const [movedItem] = newOrder.splice(currentIndex, 1);
                        newOrder.splice(targetIndex, 0, movedItem);
                        
                        setLocalOrderLines(newOrder);
                        dragCurrentIndex.current = targetIndex;
                    }
                },
                onPanResponderRelease: () => {
                    setDraggingId(null);
                    dragStartIndex.current = -1;
                    dragCurrentIndex.current = -1;
                    dragY.value = 0;
                },
                onPanResponderTerminate: () => {
                    setDraggingId(null);
                    dragStartIndex.current = -1;
                    dragCurrentIndex.current = -1;
                    dragY.value = 0;
                }
            })
        ).current;

        const animatedStyle = useAnimatedStyle(() => {
            return {
                transform: [
                    { translateY: dragY.value },
                    { scale: isDragging ? 1.04 : 1 }
                ],
                zIndex: isDragging ? 999 : 1
            };
        });

        return (
            <AnimatedReanimated.View
                layout={LinearTransition.springify().damping(22).stiffness(180)}
                style={[
                    styles.cardContainer,
                    isDragging && styles.draggingCard,
                    animatedStyle
                ]}
            >
                <View style={styles.cardContent}>
                    {/* Drag Handle */}
                    <View 
                        {...panResponder.panHandlers}
                        style={styles.dragHandle}
                    >
                        <Feather name="grid" size={16} color={isDragging ? '#3b82f6' : '#94a3b8'} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text 
                            style={[
                                styles.routeName,
                                isDragging && styles.draggingText
                            ]} 
                            numberOfLines={1}
                        >
                            {item.name}
                        </Text>
                    </View>
                </View>
                <View style={[styles.badge, isDragging && styles.draggingBadge]}>
                    <Text style={[styles.badgeText, isDragging && styles.draggingBadgeText]}>
                        {isDragging ? 'DRAGGING' : 'HOLD & DRAG'}
                    </Text>
                </View>
            </AnimatedReanimated.View>
        );
    };

    return (
        <Modal 
            visible={visible} 
            animationType="fade" 
            transparent
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.title}>Arrange Routes</Text>
                            <Text style={styles.subtitle}>
                                Hold & Drag handle to arrange daily
                            </Text>
                        </View>
                        <TouchableOpacity 
                            disabled={draggingId !== null}
                            onPress={onClose}
                            style={styles.closeButton}
                        >
                            <Feather name="x" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    {/* Draggable items container */}
                    <ScrollView 
                        style={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 30 }}
                    >
                        {localOrderLines.map((item, idx) => (
                            <DraggableItem key={item.id} item={item} index={idx} />
                        ))}
                    </ScrollView>

                    {/* Save Alignment Button */}
                    <View style={styles.footerContainer}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            disabled={draggingId !== null}
                            onPress={handleSave}
                            style={[
                                styles.saveButton,
                                draggingId !== null && { opacity: 0.5 }
                            ]}
                        >
                            <Feather name="check-circle" size={15} color="white" style={{ marginRight: 6 }} />
                            <Text style={styles.saveButtonText}>Set Tab Alignment</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
    },
    modalContent: {
        flex: 1,
        marginTop: 80,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 11,
        fontWeight: '900',
        color: '#3b82f6',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 4,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContainer: {
        marginTop: 12,
        flex: 1,
    },
    cardContainer: {
        height: 64,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    draggingCard: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dragHandle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        paddingRight: 8,
    },
    routeName: {
        fontSize: 14,
        fontWeight: '900',
        color: '#1e293b',
        textTransform: 'uppercase',
        letterSpacing: -0.2,
    },
    draggingText: {
        color: '#2563eb',
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    draggingBadge: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
    },
    badgeText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#94a3b8',
        letterSpacing: 0.5,
    },
    draggingBadgeText: {
        color: '#3b82f6',
    },
    footerContainer: {
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    saveButton: {
        backgroundColor: '#0f172a',
        borderRadius: 20,
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    }
});
