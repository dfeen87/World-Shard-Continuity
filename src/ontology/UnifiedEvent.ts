// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

export interface LifeSimEvent {
  eventId?: string;
  actorId: string;
  timestamp: number;
  interactionType: string;
  targetId?: string;
  location?: { x: number; y: number; z: number } | string | Record<string, unknown>;
  attributes?: Record<string, unknown>;
  originShard?: string;
  payload?: Record<string, unknown>;
  contextTags?: string[];
}

export interface ActionSimEvent {
  eventId?: string;
  actorId: string;
  timestamp: number;
  actionType: string;
  physicsPayload?: Record<string, unknown>;
  targetId?: string;
  location?: { x: number; y: number; z: number } | string | Record<string, unknown>;
  originShard?: string;
  payload?: Record<string, unknown>;
  contextTags?: string[];
}

export interface UnifiedEvent {
  eventId: string;
  actorId: string;
  timestamp: number;
  originShard: string;
  sourceDomain: "LifeSim" | "ActionSim";
  originalEventType: string;
  payload: Record<string, unknown>;
  contextTags: string[];
}

/**
 * Translates a LifeSimEvent into a canonical UnifiedEvent.
 */
export function translateLifeSimEvent(event: LifeSimEvent): UnifiedEvent {
  const eventId = event.eventId || `evt_lifesim_${event.actorId}_${event.timestamp}_${Math.random().toString(36).substring(2, 7)}`;
  const originShard = event.originShard || "lifesim_default";
  const contextTags = event.contextTags || [];

  const mergedPayload: Record<string, unknown> = {
    interactionType: event.interactionType,
    ...(event.targetId !== undefined && { targetId: event.targetId }),
    ...(event.location !== undefined && { location: event.location }),
    ...(event.attributes !== undefined && { attributes: event.attributes }),
    ...(event.payload || {}),
  };

  return {
    eventId,
    actorId: event.actorId,
    timestamp: event.timestamp,
    originShard,
    sourceDomain: "LifeSim",
    originalEventType: event.interactionType,
    payload: mergedPayload,
    contextTags: Array.from(new Set([...contextTags, "lifesim", event.interactionType])),
  };
}

/**
 * Translates an ActionSimEvent into a canonical UnifiedEvent.
 */
export function translateActionSimEvent(event: ActionSimEvent): UnifiedEvent {
  const eventId = event.eventId || `evt_actionsim_${event.actorId}_${event.timestamp}_${Math.random().toString(36).substring(2, 7)}`;
  const originShard = event.originShard || "actionsim_default";
  const contextTags = event.contextTags || [];

  const mergedPayload: Record<string, unknown> = {
    actionType: event.actionType,
    ...(event.physicsPayload !== undefined && { physicsPayload: event.physicsPayload }),
    ...(event.targetId !== undefined && { targetId: event.targetId }),
    ...(event.location !== undefined && { location: event.location }),
    ...(event.payload || {}),
  };

  return {
    eventId,
    actorId: event.actorId,
    timestamp: event.timestamp,
    originShard,
    sourceDomain: "ActionSim",
    originalEventType: event.actionType,
    payload: mergedPayload,
    contextTags: Array.from(new Set([...contextTags, "actionsim", event.actionType])),
  };
}
