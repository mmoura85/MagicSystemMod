import { world, system, Player } from "@minecraft/server";

// Configuration
const CONFIG = {
  MAX_MANA: 100,
  MANA_REGEN_RATE: 1.5, // per second
  MANA_REGEN_INTERVAL: 20, // ticks (1 second)
  BLINK_DISTANCE: 12,
  BLINK_COST: 15,
  
  // Ability costs
  FIREBALL_COST: 20,
  SHIELD_COST: 25,
  HEAL_COST: 30,
  DISINTEGRATE_COST: 35,
  ICE_LANCE_COST: 25,
  FREEZE_WATER_COST: 15,
  WALL_WALK_COST: 40,
  TRAP_COST: 30,
  DRAGON_BREATH_COST: 45,
  LIGHTNING_COST: 35,
  MAGIC_MISSILE_COST: 25,
  EARTH_SPIKE_COST: 20,
  EARTH_WALL_COST: 25,
  MINING_FOCUS_COST: 5,
  MAGMA_WALL_COST: 30,
  
  // Mana enhancement
  MANA_ENHANCEMENT_AMOUNT: 50,
  
  // Flying broom (no mana cost)
  BROOM_SPEED: 0.8,
  BROOM_VERTICAL_SPEED: 0.5
};

// Player data storage
const playerData = new Map();

// Load player data from dynamic properties
function loadPlayerData(player) {
  try {
    const awakened = player.getDynamicProperty("magic:awakened") || false;
    const mana = player.getDynamicProperty("magic:mana") || 0;
    const maxMana = player.getDynamicProperty("magic:maxMana") || CONFIG.MAX_MANA;
    const attributeEnhanced = player.getDynamicProperty("magic:attributeEnhanced") || false;
    
    return {
      mana: awakened ? mana : 0,
      maxMana: maxMana,
      awakened: awakened,
      isSneaking: false,
      isFlying: false,
      flyingTicks: 0,
      attributeEnhanced: attributeEnhanced,
      sneakStartTime: 0,
      sneakDuration: 0
    };
  } catch (e) {
    return {
      mana: 0,
      maxMana: CONFIG.MAX_MANA,
      awakened: false,
      isSneaking: false,
      isFlying: false,
      flyingTicks: 0,
      attributeEnhanced: false,
      sneakStartTime: 0,
      sneakDuration: 0
    };
  }
}

// Save player data to dynamic properties
function savePlayerData(player, data) {
  try {
    player.setDynamicProperty("magic:awakened", data.awakened);
    player.setDynamicProperty("magic:mana", data.mana);
    player.setDynamicProperty("magic:maxMana", data.maxMana);
    player.setDynamicProperty("magic:attributeEnhanced", data.attributeEnhanced);
  } catch (e) {
    // Silently fail if properties can't be saved
  }
}

// Initialize player data
function initPlayerData(player) {
  if (!playerData.has(player.id)) {
    const data = loadPlayerData(player);
    playerData.set(player.id, data);
  }
  return playerData.get(player.id);
}

// Get player data
function getPlayerData(player) {
  return playerData.get(player.id) || initPlayerData(player);
}

// Update mana display
function updateManaDisplay(player) {
  const data = getPlayerData(player);
  if (data.awakened) {
    // Calculate percentage for bar (always 0-20 blocks regardless of max mana)
    const manaPercent = data.mana / data.maxMana;
    const barLength = Math.floor(manaPercent * 20);
    const emptyLength = 20 - barLength;
    
    const manaBar = "█".repeat(Math.max(0, barLength)) + "░".repeat(Math.max(0, emptyLength));
    player.onScreenDisplay.setActionBar(`§bMana: §f${manaBar} §7${Math.floor(data.mana)}/${data.maxMana}`);
  }
}

// Awaken player's magic
function awakenPlayer(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    data.awakened = true;
    data.mana = CONFIG.MAX_MANA;
    savePlayerData(player, data);
    player.sendMessage("§d§l✦ Your spiritual energy awakens! ✦");
    player.sendMessage("§7Crouch to activate your Blink ability");
    player.sendMessage("§7Craft magical items to gain new abilities");
    player.playSound("random.levelup");
  }
}

// Consume mana
function consumeMana(player, amount) {
  const data = getPlayerData(player);
  if (data.mana >= amount) {
    data.mana -= amount;
    savePlayerData(player, data);
    updateManaDisplay(player);
    return true;
  }
  player.sendMessage("§cNot enough mana!");
  player.playSound("random.break");
  return false;
}

// Add mana
function addMana(player, amount) {
  const data = getPlayerData(player);
  data.mana = Math.min(data.mana + amount, data.maxMana);
  savePlayerData(player, data);
  updateManaDisplay(player);
}

// Increase max mana
function increaseMaxMana(player, amount) {
  const data = getPlayerData(player);
  data.maxMana += amount;
  data.mana = Math.min(data.mana + amount, data.maxMana); // Also restore some mana
  savePlayerData(player, data);
  updateManaDisplay(player);
  player.sendMessage(`§d§lMax Mana Increased! §f${data.maxMana - amount} → ${data.maxMana}`);
  player.playSound("random.levelup");
}

// Enhance player attributes
function enhanceAttributes(player) {
  const data = getPlayerData(player);
  if (!data.attributeEnhanced) {
    data.attributeEnhanced = true;
    savePlayerData(player, data);
    player.sendMessage("§6§l✦ Physical Attributes Enhanced! ✦");
    player.sendMessage("§7You feel faster, stronger, and more resilient");
    player.playSound("random.levelup");
  } else {
    player.sendMessage("§cYour attributes are already enhanced!");
  }
}

// Apply attribute buffs to enhanced players
function applyAttributeBuffs(player) {
  const data = getPlayerData(player);
  if (data.attributeEnhanced) {
    // Night vision (15 seconds, always active)
    player.addEffect("night_vision", 400, { amplifier: 0, showParticles: false });
    
    // Speed II (reapply every 2 seconds)
    player.addEffect("speed", 60, { amplifier: 1, showParticles: false });
    
    // Jump Boost III (reapply every 2 seconds)
    player.addEffect("jump_boost", 60, { amplifier: 2, showParticles: false });
    
    // Strength II (reapply every 2 seconds)
    player.addEffect("strength", 60, { amplifier: 1, showParticles: false });
    
    // Resistance I (reapply every 2 seconds)
    player.addEffect("resistance", 60, { amplifier: 0, showParticles: false });
    
    // Health Boost II (+4 hearts = 10 hearts total)
    player.addEffect("health_boost", 999999, { amplifier: 1, showParticles: false });
    
    // Absorption II (+4 hearts of absorption armor)
    player.addEffect("absorption", 999999, { amplifier: 1, showParticles: false });
  }
}

// Blink ability
function blinkTeleport(player) {
  const data = getPlayerData(player);
  if (!data.awakened) return;
  
  if (!consumeMana(player, CONFIG.BLINK_COST)) return;
  
  const viewDirection = player.getViewDirection();
  const currentLoc = player.location;
  
  // Calculate target location
  const targetLoc = {
    x: currentLoc.x + viewDirection.x * CONFIG.BLINK_DISTANCE,
    y: currentLoc.y + viewDirection.y * CONFIG.BLINK_DISTANCE,
    z: currentLoc.z + viewDirection.z * CONFIG.BLINK_DISTANCE
  };
  
  // Teleport player
  try {
    player.teleport(targetLoc, { dimension: player.dimension, rotation: player.getRotation() });
    player.playSound("mob.endermen.portal");
    player.dimension.spawnParticle("minecraft:portal_directional", currentLoc);
    player.dimension.spawnParticle("minecraft:portal_directional", targetLoc);
    player.sendMessage("§d§o*Blink*");
  } catch (e) {
    player.sendMessage("§cCannot blink to that location!");
    addMana(player, CONFIG.BLINK_COST); // Refund mana
  }
}

// Fireball ability
function castFireball(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.FIREBALL_COST)) return;
  
  const viewDirection = player.getViewDirection();
  const startLoc = {
    x: player.location.x + viewDirection.x * 2,
    y: player.location.y + player.getHeadLocation().y - player.location.y,
    z: player.location.z + viewDirection.z * 2
  };
  
  // Create large fireball projectile with bigger flames
  for (let i = 0; i < 30; i++) {
    const particleLoc = {
      x: startLoc.x + viewDirection.x * i,
      y: startLoc.y + viewDirection.y * i,
      z: startLoc.z + viewDirection.z * i
    };
    
    system.runTimeout(() => {
      // Large flame particles
      player.dimension.spawnParticle("minecraft:basic_flame_particle", particleLoc);
      player.dimension.spawnParticle("minecraft:basic_flame_particle", {
        x: particleLoc.x + 0.3,
        y: particleLoc.y + 0.3,
        z: particleLoc.z
      });
      player.dimension.spawnParticle("minecraft:basic_flame_particle", {
        x: particleLoc.x - 0.3,
        y: particleLoc.y - 0.3,
        z: particleLoc.z
      });
      player.dimension.spawnParticle("minecraft:basic_flame_particle", {
        x: particleLoc.x,
        y: particleLoc.y,
        z: particleLoc.z + 0.3
      });
      player.dimension.spawnParticle("minecraft:basic_flame_particle", {
        x: particleLoc.x,
        y: particleLoc.y,
        z: particleLoc.z - 0.3
      });
      
      // Melt ice along the path
      const pathBlock = player.dimension.getBlock({
        x: Math.floor(particleLoc.x),
        y: Math.floor(particleLoc.y),
        z: Math.floor(particleLoc.z)
      });
      
      if (pathBlock) {
        // Melt ice blocks
        if (pathBlock.typeId === "minecraft:ice") {
          pathBlock.setType("minecraft:water");
        } else if (pathBlock.typeId === "minecraft:packed_ice") {
          pathBlock.setType("minecraft:water");
        } else if (pathBlock.typeId === "minecraft:blue_ice") {
          pathBlock.setType("minecraft:water");
        } else if (pathBlock.typeId === "minecraft:snow" || pathBlock.typeId === "minecraft:snow_layer") {
          pathBlock.setType("minecraft:air");
        } else if (pathBlock.typeId === "minecraft:powder_snow") {
          pathBlock.setType("minecraft:air");
        }
      }
      
      // Check for entities at this location
      const entities = player.dimension.getEntities({
        location: particleLoc,
        maxDistance: 2,
        excludeTypes: ["minecraft:item"]
      });
      
      entities.forEach(entity => {
        if (entity.id !== player.id) {
          entity.applyDamage(10);
          entity.setOnFire(8, true);
        }
      });
      
      // Check for block impact
      const block = player.dimension.getBlock({
        x: Math.floor(particleLoc.x),
        y: Math.floor(particleLoc.y),
        z: Math.floor(particleLoc.z)
      });
      
      // Create explosion at end or on block hit
      if (i === 29 || (block && block.isSolid)) {
        // Large explosion effect
        player.dimension.spawnParticle("minecraft:huge_explosion_emitter", particleLoc);
        player.dimension.spawnParticle("minecraft:lava_particle", particleLoc);
        
        // Create fire and melt ice in explosion radius
        const explosionRadius = 3;
        for (let x = -explosionRadius; x <= explosionRadius; x++) {
          for (let y = -explosionRadius; y <= explosionRadius; y++) {
            for (let z = -explosionRadius; z <= explosionRadius; z++) {
              const distance = Math.sqrt(x*x + y*y + z*z);
              if (distance <= explosionRadius) {
                const fireLoc = {
                  x: Math.floor(particleLoc.x) + x,
                  y: Math.floor(particleLoc.y) + y,
                  z: Math.floor(particleLoc.z) + z
                };
                
                const fireBlock = player.dimension.getBlock(fireLoc);
                const blockAbove = player.dimension.getBlock({
                  x: fireLoc.x,
                  y: fireLoc.y + 1,
                  z: fireLoc.z
                });
                
                if (fireBlock) {
                  // Melt ice in explosion radius
                  if (fireBlock.typeId === "minecraft:ice" || 
                      fireBlock.typeId === "minecraft:packed_ice" || 
                      fireBlock.typeId === "minecraft:blue_ice") {
                    fireBlock.setType("minecraft:water");
                  } else if (fireBlock.typeId === "minecraft:snow" || 
                           fireBlock.typeId === "minecraft:snow_layer" ||
                           fireBlock.typeId === "minecraft:powder_snow") {
                    fireBlock.setType("minecraft:air");
                  }
                  // Set fire on top of solid blocks (but not melted ice/snow)
                  else if (Math.random() > 0.5 && fireBlock.isSolid && 
                           blockAbove && blockAbove.typeId === "minecraft:air") {
                    blockAbove.setType("minecraft:fire");
                  }
                }
              }
            }
          }
        }
        
        // Damage entities in explosion radius
        const explosionEntities = player.dimension.getEntities({
          location: particleLoc,
          maxDistance: explosionRadius,
          excludeTypes: ["minecraft:item"]
        });
        
        explosionEntities.forEach(entity => {
          if (entity.id !== player.id) {
            entity.applyDamage(15);
            entity.setOnFire(10, true);
          }
        });
        
        player.playSound("random.explode");
      }
    }, i * 2);
  }
  
  player.playSound("mob.ghast.fireball");
  player.sendMessage("§6§o*Fireball launched*");
}

// Shield ability
function castShield(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.SHIELD_COST)) return;
  
  player.addEffect("resistance", 200, { amplifier: 2 });
  player.addEffect("fire_resistance", 200, { amplifier: 0 });
  player.playSound("random.orb");
  player.dimension.spawnParticle("minecraft:basic_flame_particle", player.location);
  player.sendMessage("§e§o*Magical shield activated*");
}

// Heal ability
function castHeal(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.HEAL_COST)) return;
  
  player.addEffect("instant_health", 1, { amplifier: 1 });
  player.addEffect("regeneration", 100, { amplifier: 1 });
  player.playSound("random.levelup");
  player.dimension.spawnParticle("minecraft:heart_particle", player.location);
  player.sendMessage("§a§o*Healing energy flows through you*");
}

// Ice Lance ability
function castIceLance(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.ICE_LANCE_COST)) return;
  
  const viewDirection = player.getViewDirection();
  const startLoc = {
    x: player.location.x + viewDirection.x * 2,
    y: player.location.y + player.getHeadLocation().y - player.location.y,
    z: player.location.z + viewDirection.z * 2
  };
  
  // Create large ice lance projectile with multiple particles
  for (let i = 0; i < 25; i++) {
    const particleLoc = {
      x: startLoc.x + viewDirection.x * i,
      y: startLoc.y + viewDirection.y * i,
      z: startLoc.z + viewDirection.z * i
    };
    
    system.runTimeout(() => {
      // Multiple ice/blue particles for larger visual
      player.dimension.spawnParticle("minecraft:blue_flame_particle", particleLoc);
      player.dimension.spawnParticle("minecraft:blue_flame_particle", {
        x: particleLoc.x + 0.25,
        y: particleLoc.y + 0.25,
        z: particleLoc.z
      });
      player.dimension.spawnParticle("minecraft:blue_flame_particle", {
        x: particleLoc.x - 0.25,
        y: particleLoc.y - 0.25,
        z: particleLoc.z
      });
      player.dimension.spawnParticle("minecraft:blue_flame_particle", {
        x: particleLoc.x,
        y: particleLoc.y,
        z: particleLoc.z + 0.25
      });
      player.dimension.spawnParticle("minecraft:blue_flame_particle", {
        x: particleLoc.x,
        y: particleLoc.y,
        z: particleLoc.z - 0.25
      });
      
      // Add snow particles for icy effect
      player.dimension.spawnParticle("minecraft:snowflake_particle", particleLoc);
      player.dimension.spawnParticle("minecraft:snowflake_particle", {
        x: particleLoc.x + 0.3,
        y: particleLoc.y,
        z: particleLoc.z
      });
      player.dimension.spawnParticle("minecraft:snowflake_particle", {
        x: particleLoc.x - 0.3,
        y: particleLoc.y,
        z: particleLoc.z
      });
      
      // Check for entities at this location
      const entities = player.dimension.getEntities({
        location: particleLoc,
        maxDistance: 2,
        excludeTypes: ["minecraft:item"]
      });
      
      entities.forEach(entity => {
        if (entity.id !== player.id) {
          entity.applyDamage(12);
          entity.addEffect("slowness", 100, { amplifier: 3 });
        }
      });
      
      // Check for block impact
      const block = player.dimension.getBlock({
        x: Math.floor(particleLoc.x),
        y: Math.floor(particleLoc.y),
        z: Math.floor(particleLoc.z)
      });
      
      // Create ice explosion at end or on block hit
      if (i === 24 || (block && block.typeId !== "minecraft:air")) {
        // Large ice explosion effect
        player.dimension.spawnParticle("minecraft:ice_evaporation_emitter", particleLoc);
        player.dimension.spawnParticle("minecraft:snowflake_particle", particleLoc);
        
        // Freeze area around impact
        const freezeRadius = 2;
        for (let x = -freezeRadius; x <= freezeRadius; x++) {
          for (let y = -freezeRadius; y <= freezeRadius; y++) {
            for (let z = -freezeRadius; z <= freezeRadius; z++) {
              const distance = Math.sqrt(x*x + y*y + z*z);
              if (distance <= freezeRadius) {
                const freezeLoc = {
                  x: Math.floor(particleLoc.x) + x,
                  y: Math.floor(particleLoc.y) + y,
                  z: Math.floor(particleLoc.z) + z
                };
                
                const freezeBlock = player.dimension.getBlock(freezeLoc);
                
                // Turn water to ice
                if (freezeBlock && (freezeBlock.typeId === "minecraft:water" || freezeBlock.typeId === "minecraft:flowing_water")) {
                  freezeBlock.setType("minecraft:ice");
                }
                
                // Turn lava to obsidian
                if (freezeBlock && (freezeBlock.typeId === "minecraft:lava" || freezeBlock.typeId === "minecraft:flowing_lava")) {
                  freezeBlock.setType("minecraft:obsidian");
                }
                
                // Put out fire
                if (freezeBlock && freezeBlock.typeId === "minecraft:fire") {
                  freezeBlock.setType("minecraft:air");
                }
              }
            }
          }
        }
        
        // Freeze and damage entities in explosion radius
        const explosionEntities = player.dimension.getEntities({
          location: particleLoc,
          maxDistance: freezeRadius,
          excludeTypes: ["minecraft:item"]
        });
        
        explosionEntities.forEach(entity => {
          if (entity.id !== player.id) {
            entity.applyDamage(8);
            entity.addEffect("slowness", 120, { amplifier: 4 });
          }
        });
        
        player.playSound("random.glass");
      }
    }, i * 2);
  }
  
  player.playSound("random.glass");
  player.sendMessage("§b§o*Ice lance pierces forward*");
}

// Freeze Water ability
function castFreezeWater(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.FREEZE_WATER_COST)) return;
  
  const playerLoc = player.location;
  const radius = 5;
  
  // Freeze water in radius
  for (let x = -radius; x <= radius; x++) {
    for (let y = -2; y <= 2; y++) {
      for (let z = -radius; z <= radius; z++) {
        const checkLoc = {
          x: Math.floor(playerLoc.x) + x,
          y: Math.floor(playerLoc.y) + y,
          z: Math.floor(playerLoc.z) + z
        };
        
        const block = player.dimension.getBlock(checkLoc);
        if (block && (block.typeId === "minecraft:water" || block.typeId === "minecraft:flowing_water")) {
          block.setType("minecraft:ice");
        }
      }
    }
  }
  
  player.playSound("random.glass");
  player.sendMessage("§b§o*Water freezes around you*");
}

// Disintegrate Ray ability
function castDisintegrate(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.DISINTEGRATE_COST)) return;
  
  const viewDirection = player.getViewDirection();
  const startLoc = {
    x: player.location.x + viewDirection.x,
    y: player.location.y + player.getHeadLocation().y - player.location.y,
    z: player.location.z + viewDirection.z
  };
  
  // Create thick energy beam disintegrate ray effect
  for (let i = 0; i < 25; i++) {
    const rayLoc = {
      x: startLoc.x + viewDirection.x * i,
      y: startLoc.y + viewDirection.y * i,
      z: startLoc.z + viewDirection.z * i
    };
    
    system.runTimeout(() => {
      // Core beam particles (center)
      player.dimension.spawnParticle("minecraft:end_rod", rayLoc);
      player.dimension.spawnParticle("minecraft:critical_hit_emitter", rayLoc);
      
      // Create thick beam by spawning particles in a circle around the center
      const beamRadius = 0.3;
      const particlesPerRing = 8;
      
      for (let j = 0; j < particlesPerRing; j++) {
        const angle = (j / particlesPerRing) * Math.PI * 2;
        const offsetX = Math.cos(angle) * beamRadius;
        const offsetZ = Math.sin(angle) * beamRadius;
        
        player.dimension.spawnParticle("minecraft:end_rod", {
          x: rayLoc.x + offsetX,
          y: rayLoc.y,
          z: rayLoc.z + offsetZ
        });
        
        player.dimension.spawnParticle("minecraft:critical_hit_emitter", {
          x: rayLoc.x + offsetX,
          y: rayLoc.y,
          z: rayLoc.z + offsetZ
        });
      }
      
      // Add inner ring for extra thickness
      const innerRadius = 0.15;
      for (let j = 0; j < particlesPerRing; j++) {
        const angle = (j / particlesPerRing) * Math.PI * 2;
        const offsetX = Math.cos(angle) * innerRadius;
        const offsetZ = Math.sin(angle) * innerRadius;
        
        player.dimension.spawnParticle("minecraft:end_rod", {
          x: rayLoc.x + offsetX,
          y: rayLoc.y,
          z: rayLoc.z + offsetZ
        });
      }
      
      // Damage entities
      const entities = player.dimension.getEntities({
        location: rayLoc,
        maxDistance: 2,
        excludeTypes: ["minecraft:item"]
      });
      
      entities.forEach(entity => {
        if (entity.id !== player.id) {
          entity.applyDamage(15);
        }
      });
      
      // Break blocks - expanded list
      const block = player.dimension.getBlock({
        x: Math.floor(rayLoc.x),
        y: Math.floor(rayLoc.y),
        z: Math.floor(rayLoc.z)
      });
      
      if (block) {
        const breakable = [
          // Original blocks
          "minecraft:dirt", "minecraft:grass", "minecraft:sand", "minecraft:gravel", 
          "minecraft:clay", "minecraft:snow", "minecraft:glass",
          
          // Wood blocks
          "minecraft:oak_log", "minecraft:spruce_log", "minecraft:birch_log", 
          "minecraft:jungle_log", "minecraft:acacia_log", "minecraft:dark_oak_log",
          "minecraft:mangrove_log", "minecraft:cherry_log",
          "minecraft:oak_wood", "minecraft:spruce_wood", "minecraft:birch_wood",
          "minecraft:jungle_wood", "minecraft:acacia_wood", "minecraft:dark_oak_wood",
          "minecraft:mangrove_wood", "minecraft:cherry_wood",
          "minecraft:oak_planks", "minecraft:spruce_planks", "minecraft:birch_planks",
          "minecraft:jungle_planks", "minecraft:acacia_planks", "minecraft:dark_oak_planks",
          "minecraft:mangrove_planks", "minecraft:cherry_planks",
          "minecraft:stripped_oak_log", "minecraft:stripped_spruce_log", 
          "minecraft:stripped_birch_log", "minecraft:stripped_jungle_log",
          "minecraft:stripped_acacia_log", "minecraft:stripped_dark_oak_log",
          "minecraft:stripped_mangrove_log", "minecraft:stripped_cherry_log",
          
          // Stone blocks
          "minecraft:stone", "minecraft:cobblestone", "minecraft:mossy_cobblestone",
          "minecraft:smooth_stone", "minecraft:stone_bricks", "minecraft:cracked_stone_bricks",
          "minecraft:mossy_stone_bricks", "minecraft:chiseled_stone_bricks",
          "minecraft:granite", "minecraft:polished_granite",
          "minecraft:diorite", "minecraft:polished_diorite",
          "minecraft:andesite", "minecraft:polished_andesite",
          "minecraft:sandstone", "minecraft:smooth_sandstone", "minecraft:chiseled_sandstone",
          "minecraft:red_sandstone", "minecraft:smooth_red_sandstone", "minecraft:chiseled_red_sandstone",
          "minecraft:cobbled_deepslate", "minecraft:deepslate", "minecraft:deepslate_bricks",
          "minecraft:tuff", "minecraft:calcite", "minecraft:dripstone_block",
          
          // Ice blocks (disintegrate removes them)
          "minecraft:ice", "minecraft:packed_ice", "minecraft:blue_ice",
          "minecraft:snow", "minecraft:snow_layer", "minecraft:powder_snow",
          
          // Other breakables
          "minecraft:netherrack", "minecraft:end_stone", "minecraft:basalt",
          "minecraft:blackstone", "minecraft:soul_sand", "minecraft:soul_soil",
          "minecraft:mud", "minecraft:packed_mud", "minecraft:mud_bricks"
        ];
        
        if (breakable.includes(block.typeId)) {
          block.setType("minecraft:air");
          // Spawn break particles
          player.dimension.spawnParticle("minecraft:huge_explosion_lab_misc_emitter", {
            x: Math.floor(rayLoc.x) + 0.5,
            y: Math.floor(rayLoc.y) + 0.5,
            z: Math.floor(rayLoc.z) + 0.5
          });
        }
      }
    }, i * 2);
  }
  
  player.playSound("mob.wither.shoot");
  player.sendMessage("§5§o*Disintegration ray fires*");
}

// Trap ability
function castTrap(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.TRAP_COST)) return;
  
  const viewDirection = player.getViewDirection();
  const startLoc = {
    x: player.location.x,
    y: player.location.y + 1.5,
    z: player.location.z
  };
  
  // Create projectile orb that travels forward
  let hitGround = false;
  let trapLocation = null;
  
  for (let i = 1; i <= 30; i++) {
    const orbLoc = {
      x: startLoc.x + viewDirection.x * i,
      y: startLoc.y + viewDirection.y * i - (i * 0.08), // Stronger gravity
      z: startLoc.z + viewDirection.z * i
    };
    
    system.runTimeout(() => {
      if (hitGround) return;
      
      // Spawn orb particle trail
      player.dimension.spawnParticle("minecraft:dragon_breath_trail", orbLoc);
      player.dimension.spawnParticle("minecraft:mob_spell_emitter", orbLoc);
      
      // Check current position block
      const currentBlock = player.dimension.getBlock({
        x: Math.floor(orbLoc.x),
        y: Math.floor(orbLoc.y),
        z: Math.floor(orbLoc.z)
      });
      
      // Check block below
      const blockBelow = player.dimension.getBlock({
        x: Math.floor(orbLoc.x),
        y: Math.floor(orbLoc.y) - 1,
        z: Math.floor(orbLoc.z)
      });
      
      // Hit detection - if we hit a solid block or are just above ground
      if (currentBlock) {
        // Hit a solid block directly
        if (currentBlock.isSolid) {
          hitGround = true;
          trapLocation = {
            x: Math.floor(orbLoc.x),
            y: Math.floor(orbLoc.y) + 1,
            z: Math.floor(orbLoc.z)
          };
          createTrapCage(player, trapLocation);
        }
        // Just above ground
        else if (blockBelow && blockBelow.isSolid) {
          hitGround = true;
          trapLocation = {
            x: Math.floor(orbLoc.x),
            y: Math.floor(orbLoc.y),
            z: Math.floor(orbLoc.z)
          };
          createTrapCage(player, trapLocation);
        }
      }
      
      // Check for entities at this location (trap mobs directly)
      const entities = player.dimension.getEntities({
        location: orbLoc,
        maxDistance: 1.5,
        excludeTypes: ["minecraft:item"],
        excludeFamilies: ["inanimate"]
      });
      
      entities.forEach(entity => {
        if (entity.id !== player.id && !hitGround) {
          hitGround = true;
          trapLocation = {
            x: Math.floor(entity.location.x),
            y: Math.floor(entity.location.y),
            z: Math.floor(entity.location.z)
          };
          createTrapCage(player, trapLocation);
        }
      });
      
    }, i * 3);
  }
  
  player.playSound("random.bow");
  player.sendMessage("§d§o*Trap orb launched*");
}

// Helper function to create the trap cage
function createTrapCage(player, targetLoc) {
  // Create a barrier trap cage
  const trapBlocks = [
    // Floor
    {x: 0, y: -1, z: 0},
    
    // Lower walls (corners and sides)
    {x: 1, y: 0, z: 0}, {x: -1, y: 0, z: 0},
    {x: 0, y: 0, z: 1}, {x: 0, y: 0, z: -1},
    {x: 1, y: 0, z: 1}, {x: -1, y: 0, z: 1},
    {x: 1, y: 0, z: -1}, {x: -1, y: 0, z: -1},
    
    // Middle walls
    {x: 1, y: 1, z: 0}, {x: -1, y: 1, z: 0},
    {x: 0, y: 1, z: 1}, {x: 0, y: 1, z: -1},
    {x: 1, y: 1, z: 1}, {x: -1, y: 1, z: 1},
    {x: 1, y: 1, z: -1}, {x: -1, y: 1, z: -1},
    
    // Upper walls
    {x: 1, y: 2, z: 0}, {x: -1, y: 2, z: 0},
    {x: 0, y: 2, z: 1}, {x: 0, y: 2, z: -1},
    {x: 1, y: 2, z: 1}, {x: -1, y: 2, z: 1},
    {x: 1, y: 2, z: -1}, {x: -1, y: 2, z: -1},
    
    // Ceiling
    {x: 0, y: 3, z: 0}
  ];
  
  const placedBlocks = [];
  
  trapBlocks.forEach(offset => {
    const blockLoc = {
      x: targetLoc.x + offset.x,
      y: targetLoc.y + offset.y,
      z: targetLoc.z + offset.z
    };
    
    const block = player.dimension.getBlock(blockLoc);
    if (block && block.typeId === "minecraft:air") {
      block.setType("minecraft:barrier");
      placedBlocks.push(blockLoc);
      
      // Spawn particle effect when placing barrier
      player.dimension.spawnParticle("minecraft:evoker_spell", {
        x: blockLoc.x + 0.5,
        y: blockLoc.y + 0.5,
        z: blockLoc.z + 0.5
      });
    }
  });
  
  // Remove barriers after 10 seconds
  system.runTimeout(() => {
    placedBlocks.forEach(blockLoc => {
      const removeBlock = player.dimension.getBlock(blockLoc);
      if (removeBlock && removeBlock.typeId === "minecraft:barrier") {
        removeBlock.setType("minecraft:air");
        // Spawn particle when trap disappears
        player.dimension.spawnParticle("minecraft:evoker_spell", {
          x: blockLoc.x + 0.5,
          y: blockLoc.y + 0.5,
          z: blockLoc.z + 0.5
        });
      }
    });
    player.playSound("random.glass");
  }, 200);
  
  player.playSound("block.end_portal_frame.fill");
  player.sendMessage("§d§o*Trap cage created*");
}

// Dragon Breath ability
function castDragonBreath(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.DRAGON_BREATH_COST)) return;
  
  const viewDirection = player.getViewDirection();
  const startLoc = {
    x: player.location.x,
    y: player.location.y + 1.5,
    z: player.location.z
  };
  
  // Create cone of dragon breath
  const breathDistance = 15;
  const coneAngle = 30; // degrees
  
  for (let distance = 1; distance <= breathDistance; distance++) {
    const coneWidth = distance * 0.5; // Cone expands as it goes
    
    // Create multiple rays in a cone pattern
    for (let angle = -coneAngle; angle <= coneAngle; angle += 10) {
      const radAngle = (angle * Math.PI) / 180;
      
      // Horizontal spread
      for (let spread = -coneWidth; spread <= coneWidth; spread += 0.5) {
        system.runTimeout(() => {
          const breathLoc = {
            x: startLoc.x + viewDirection.x * distance + Math.sin(radAngle) * spread,
            y: startLoc.y + viewDirection.y * distance,
            z: startLoc.z + viewDirection.z * distance + Math.cos(radAngle) * spread
          };
          
          try {
            // Spawn dragon breath particles (less bright, more visible)
            player.dimension.spawnParticle("minecraft:dragon_breath_trail", breathLoc);
            
            // Only spawn brighter particles occasionally
            if (Math.random() > 0.7) {
              player.dimension.spawnParticle("minecraft:dragon_dying_explosion", breathLoc);
            }
            
            if (Math.random() > 0.8) {
              player.dimension.spawnParticle("minecraft:basic_flame_particle", breathLoc);
            }
            
            // Melt ice and set fire to blocks
            const breathBlock = player.dimension.getBlock({
              x: Math.floor(breathLoc.x),
              y: Math.floor(breathLoc.y),
              z: Math.floor(breathLoc.z)
            });
            
            if (breathBlock) {
              // Melt ice
              if (breathBlock.typeId === "minecraft:ice" || 
                  breathBlock.typeId === "minecraft:packed_ice" || 
                  breathBlock.typeId === "minecraft:blue_ice") {
                breathBlock.setType("minecraft:water");
              } 
              // Melt snow
              else if (breathBlock.typeId === "minecraft:snow" || 
                       breathBlock.typeId === "minecraft:snow_layer" ||
                       breathBlock.typeId === "minecraft:powder_snow") {
                breathBlock.setType("minecraft:air");
              }
              // Set fire to flammable blocks (increased chance)
              else if (breathBlock.isSolid) {
                const flammable = [
                  "oak_log", "spruce_log", "birch_log", "jungle_log", "acacia_log", "dark_oak_log",
                  "oak_planks", "spruce_planks", "birch_planks", "jungle_planks", "acacia_planks", "dark_oak_planks",
                  "oak_leaves", "spruce_leaves", "birch_leaves", "jungle_leaves", "acacia_leaves", "dark_oak_leaves",
                  "oak_wood", "spruce_wood", "birch_wood", "jungle_wood", "acacia_wood", "dark_oak_wood",
                  "wool", "tnt", "hay_block", "bamboo", "scaffolding"
                ];
                
                // Check if block is flammable
                const isFlammable = flammable.some(type => breathBlock.typeId.includes(type));
                
                if (isFlammable && Math.random() > 0.3) { // 70% chance now
                  const blockAbove = player.dimension.getBlock({
                    x: Math.floor(breathLoc.x),
                    y: Math.floor(breathLoc.y) + 1,
                    z: Math.floor(breathLoc.z)
                  });
                  
                  if (blockAbove && blockAbove.typeId === "minecraft:air") {
                    blockAbove.setType("minecraft:fire");
                  }
                }
              }
            }
            
            // Damage entities in breath (increased damage)
            const entities = player.dimension.getEntities({
              location: breathLoc,
              maxDistance: 1.5,
              excludeTypes: ["minecraft:item"]
            });
            
            entities.forEach(entity => {
              if (entity.id !== player.id) {
                entity.applyDamage(6);
                entity.setOnFire(8, true);
                entity.addEffect("wither", 80, { amplifier: 1 });
              }
            });
          } catch (e) {
            // Silently fail if chunk is unloaded
          }
        }, distance * 3);
      }
    }
  }
  
  // Create lingering damage area at the end
  for (let i = 0; i < 8; i++) {
    system.runTimeout(() => {
      const cloudLoc = {
        x: startLoc.x + viewDirection.x * breathDistance,
        y: startLoc.y + viewDirection.y * breathDistance,
        z: startLoc.z + viewDirection.z * breathDistance
      };
      
      try {
        player.dimension.spawnParticle("minecraft:dragon_breath_trail", cloudLoc);
        
        if (Math.random() > 0.5) {
          player.dimension.spawnParticle("minecraft:dragon_dying_explosion", cloudLoc);
        }
        
        // Damage entities in lingering cloud (increased)
        const entities = player.dimension.getEntities({
          location: cloudLoc,
          maxDistance: 3,
          excludeTypes: ["minecraft:item"]
        });
        
        entities.forEach(entity => {
          if (entity.id !== player.id) {
            entity.applyDamage(4);
            entity.setOnFire(5, true);
          }
        });
      } catch (e) {
        // Silently fail if chunk is unloaded
      }
    }, breathDistance * 3 + (i * 20));
  }
  
  player.playSound("mob.enderdragon.growl");
  player.sendMessage("§5§o*Dragon's breath unleashed*");
}

// Lightning Bolt ability
function castLightning(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.LIGHTNING_COST)) return;
  
  const viewDirection = player.getViewDirection();
  const playerLoc = player.location;
  
  // Find strike location (where player is looking)
  let strikeLoc = null;
  for (let i = 1; i <= 30; i++) {
    const checkLoc = {
      x: playerLoc.x + viewDirection.x * i,
      y: playerLoc.y + viewDirection.y * i,
      z: playerLoc.z + viewDirection.z * i
    };
    
    const block = player.dimension.getBlock({
      x: Math.floor(checkLoc.x),
      y: Math.floor(checkLoc.y),
      z: Math.floor(checkLoc.z)
    });
    
    if (block && block.isSolid) {
      strikeLoc = {
        x: Math.floor(checkLoc.x),
        y: Math.floor(checkLoc.y) + 1,
        z: Math.floor(checkLoc.z)
      };
      break;
    }
  }
  
  // If no solid ground found, strike at max range
  if (!strikeLoc) {
    strikeLoc = {
      x: Math.floor(playerLoc.x + viewDirection.x * 30),
      y: Math.floor(playerLoc.y + viewDirection.y * 30),
      z: Math.floor(playerLoc.z + viewDirection.z * 30)
    };
  }
  
  // Spawn lightning bolt
  player.dimension.spawnEntity("minecraft:lightning_bolt", strikeLoc);
  
  // Create visual effects
  for (let i = 0; i < 10; i++) {
    system.runTimeout(() => {
      player.dimension.spawnParticle("minecraft:basic_crit_particle", {
        x: strikeLoc.x + 0.5,
        y: strikeLoc.y + i,
        z: strikeLoc.z + 0.5
      });
    }, i * 2);
  }
  
  // Damage entities at strike point
  const strikeEntities = player.dimension.getEntities({
    location: strikeLoc,
    maxDistance: 3,
    excludeTypes: ["minecraft:item"]
  });
  
  strikeEntities.forEach(entity => {
    if (entity.id !== player.id) {
      entity.applyDamage(20);
      entity.setOnFire(5, true);
    }
  });
  
  // Chain lightning to nearby enemies
  system.runTimeout(() => {
    const chainTargets = player.dimension.getEntities({
      location: strikeLoc,
      maxDistance: 8,
      excludeTypes: ["minecraft:item"],
      excludeFamilies: ["inanimate"]
    });
    
    let chained = 0;
    chainTargets.forEach(entity => {
      if (entity.id !== player.id && chained < 3) {
        // Create chain lightning effect
        const entityLoc = entity.location;
        
        for (let i = 0; i < 5; i++) {
          const t = i / 5;
          const chainLoc = {
            x: strikeLoc.x + (entityLoc.x - strikeLoc.x) * t,
            y: strikeLoc.y + (entityLoc.y - strikeLoc.y) * t,
            z: strikeLoc.z + (entityLoc.z - strikeLoc.z) * t
          };
          
          system.runTimeout(() => {
            player.dimension.spawnParticle("minecraft:basic_crit_particle", chainLoc);
            player.dimension.spawnParticle("minecraft:electric_spark_particle", chainLoc);
          }, i * 2);
        }
        
        entity.applyDamage(12);
        chained++;
      }
    });
    
    if (chained > 0) {
      player.sendMessage(`§e§o*Lightning chains to ${chained} enemies*`);
    }
  }, 10);
  
  player.playSound("ambient.weather.thunder");
  player.sendMessage("§e§o*Lightning strikes!*");
}

// Magic Missile ability
function castMagicMissile(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.MAGIC_MISSILE_COST)) return;
  
  const playerLoc = player.location;
  
  // Find up to 5 nearest enemies
  const nearbyEntities = player.dimension.getEntities({
    location: playerLoc,
    maxDistance: 20,
    excludeTypes: ["minecraft:item"],
    excludeFamilies: ["inanimate"]
  });
  
  const targets = [];
  nearbyEntities.forEach(entity => {
    if (entity.id !== player.id && targets.length < 5) {
      targets.push(entity);
    }
  });
  
  if (targets.length === 0) {
    player.sendMessage("§cNo targets in range!");
    addMana(player, CONFIG.MAGIC_MISSILE_COST); // Refund mana
    return;
  }
  
  // Launch 5 missiles
  for (let i = 0; i < 5; i++) {
    system.runTimeout(() => {
      const target = targets[i % targets.length]; // Cycle through targets if less than 5
      
      if (!target || !target.isValid()) return;
      
      const startLoc = {
        x: playerLoc.x,
        y: playerLoc.y + 1.5,
        z: playerLoc.z
      };
      
      // Create homing missile effect
      const missileSteps = 20;
      for (let step = 0; step < missileSteps; step++) {
        system.runTimeout(() => {
          if (!target.isValid()) return;
          
          const t = step / missileSteps;
          const targetLoc = target.location;
          
          const missileLoc = {
            x: startLoc.x + (targetLoc.x - startLoc.x) * t,
            y: startLoc.y + (targetLoc.y - startLoc.y) * t + Math.sin(t * Math.PI) * 2,
            z: startLoc.z + (targetLoc.z - startLoc.z) * t
          };
          
          // Spawn missile particles
          player.dimension.spawnParticle("minecraft:mob_spell_emitter", missileLoc);
          player.dimension.spawnParticle("minecraft:villager_happy", missileLoc);
          
          // Hit target on last step
          if (step === missileSteps - 1) {
            target.applyDamage(8);
            player.dimension.spawnParticle("minecraft:explosion_particle", targetLoc);
            player.playSound("random.orb", { location: targetLoc });
          }
        }, step * 2);
      }
    }, i * 5);
  }
  
  player.playSound("mob.evocation_illager.cast_spell");
}

// Earth Spike ability
function castEarthSpike(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.EARTH_SPIKE_COST)) return;
  
  const viewDirection = player.getViewDirection();
  const startLoc = {
    x: player.location.x,
    y: player.location.y + 1,
    z: player.location.z
  };
  
  // Launch 3 stone spikes in a spread pattern
  const spreadAngles = [-10, 0, 10]; // degrees
  
  spreadAngles.forEach((angleOffset, index) => {
    system.runTimeout(() => {
      const radAngle = (angleOffset * Math.PI) / 180;
      
      // Rotate view direction by angle offset
      const spreadX = viewDirection.x * Math.cos(radAngle) - viewDirection.z * Math.sin(radAngle);
      const spreadZ = viewDirection.x * Math.sin(radAngle) + viewDirection.z * Math.cos(radAngle);
      
      // Create stone spike projectile
      for (let i = 1; i <= 20; i++) {
        const spikeLoc = {
          x: startLoc.x + spreadX * i,
          y: startLoc.y + viewDirection.y * i,
          z: startLoc.z + spreadZ * i
        };
        
        system.runTimeout(() => {
          try {
            // Spawn stone/earth particles
            player.dimension.spawnParticle("minecraft:block_destruct", spikeLoc);
            player.dimension.spawnParticle("minecraft:falling_dust_concrete_powder_particle", spikeLoc);
            
            // Damage entities
            const entities = player.dimension.getEntities({
              location: spikeLoc,
              maxDistance: 2,
              excludeTypes: ["minecraft:item"]
            });
            
            entities.forEach(entity => {
              if (entity.id !== player.id) {
                entity.applyDamage(10);
              }
            });
          } catch (e) {
            // Silently fail if chunk unloaded
          }
        }, i * 2);
      }
    }, index * 5);
  });
  
  player.playSound("dig.stone");
  player.sendMessage("§6§o*Earth spikes launched*");
}

// Earth Wall ability
function castEarthWall(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.EARTH_WALL_COST)) return;
  
  const viewDirection = player.getViewDirection();
  const playerLoc = player.location;
  
  // Find ground location in front of player
  let wallBaseLoc = {
    x: Math.floor(playerLoc.x + viewDirection.x * 3),
    y: Math.floor(playerLoc.y),
    z: Math.floor(playerLoc.z + viewDirection.z * 3)
  };
  
  // Create 5 wide, 3 tall wall
  const wallBlocks = [];
  const wallWidth = 5;
  const wallHeight = 3;
  
  // Determine wall orientation - which axis is more dominant
  const absX = Math.abs(viewDirection.x);
  const absZ = Math.abs(viewDirection.z);
  
  for (let h = 0; h < wallHeight; h++) {
    for (let w = -Math.floor(wallWidth / 2); w <= Math.floor(wallWidth / 2); w++) {
      let blockLoc;
      
      // If looking more along Z axis, wall extends along X axis
      if (absZ > absX) {
        blockLoc = {
          x: wallBaseLoc.x + w,
          y: wallBaseLoc.y + h,
          z: wallBaseLoc.z
        };
      } else {
        // If looking more along X axis, wall extends along Z axis
        blockLoc = {
          x: wallBaseLoc.x,
          y: wallBaseLoc.y + h,
          z: wallBaseLoc.z + w
        };
      }
      
      try {
        const block = player.dimension.getBlock(blockLoc);
        if (block && block.typeId === "minecraft:air") {
          block.setType("minecraft:cobblestone");
          wallBlocks.push(blockLoc);
          
          // Spawn particles
          player.dimension.spawnParticle("minecraft:block_destruct", {
            x: blockLoc.x + 0.5,
            y: blockLoc.y + 0.5,
            z: blockLoc.z + 0.5
          });
        }
      } catch (e) {
        // Silently fail if chunk unloaded
      }
    }
  }
  
  // Remove wall after 30 seconds
  system.runTimeout(() => {
    wallBlocks.forEach(blockLoc => {
      try {
        const block = player.dimension.getBlock(blockLoc);
        if (block && block.typeId === "minecraft:cobblestone") {
          block.setType("minecraft:air");
          player.dimension.spawnParticle("minecraft:block_destruct", {
            x: blockLoc.x + 0.5,
            y: blockLoc.y + 0.5,
            z: blockLoc.z + 0.5
          });
        }
      } catch (e) {
        // Silently fail
      }
    });
  }, 600); // 30 seconds
  
  player.playSound("dig.stone");
  player.sendMessage("§6§o*Earth wall raised*");
}

// Magma Wall ability
function castMagmaWall(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.MAGMA_WALL_COST)) return;
  
  const viewDirection = player.getViewDirection();
  const playerLoc = player.location;
  
  // Find ground location in front of player
  let wallBaseLoc = {
    x: Math.floor(playerLoc.x + viewDirection.x * 3),
    y: Math.floor(playerLoc.y),
    z: Math.floor(playerLoc.z + viewDirection.z * 3)
  };
  
  // Create 5 wide, 3 tall magma wall
  const wallBlocks = [];
  const wallWidth = 5;
  const wallHeight = 3;
  
  // Determine wall orientation - which axis is more dominant
  const absX = Math.abs(viewDirection.x);
  const absZ = Math.abs(viewDirection.z);
  
  for (let h = 0; h < wallHeight; h++) {
    for (let w = -Math.floor(wallWidth / 2); w <= Math.floor(wallWidth / 2); w++) {
      let blockLoc;
      
      // If looking more along Z axis, wall extends along X axis
      if (absZ > absX) {
        blockLoc = {
          x: wallBaseLoc.x + w,
          y: wallBaseLoc.y + h,
          z: wallBaseLoc.z
        };
      } else {
        // If looking more along X axis, wall extends along Z axis
        blockLoc = {
          x: wallBaseLoc.x,
          y: wallBaseLoc.y + h,
          z: wallBaseLoc.z + w
        };
      }
      
      try {
        const block = player.dimension.getBlock(blockLoc);
        if (block && block.typeId === "minecraft:air") {
          block.setType("minecraft:magma");
          wallBlocks.push(blockLoc);
          
          // Spawn fire particles
          player.dimension.spawnParticle("minecraft:lava_particle", {
            x: blockLoc.x + 0.5,
            y: blockLoc.y + 0.5,
            z: blockLoc.z + 0.5
          });
        }
      } catch (e) {
        // Silently fail if chunk unloaded
      }
    }
  }
  
  // Remove wall after 30 seconds
  system.runTimeout(() => {
    wallBlocks.forEach(blockLoc => {
      try {
        const block = player.dimension.getBlock(blockLoc);
        if (block && block.typeId === "minecraft:magma") {
          block.setType("minecraft:air");
          player.dimension.spawnParticle("minecraft:lava_particle", {
            x: blockLoc.x + 0.5,
            y: blockLoc.y + 0.5,
            z: blockLoc.z + 0.5
          });
        }
      } catch (e) {
        // Silently fail
      }
    });
  }, 600); // 30 seconds
  
  player.playSound("bucket.fill_lava");
  player.sendMessage("§c§o*Magma wall erupts*");
}

// Mining Focus ability
function castMiningFocus(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return;
  }
  
  if (!consumeMana(player, CONFIG.MINING_FOCUS_COST)) return;
  
  const viewDirection = player.getViewDirection();
  const playerLoc = player.location;
  
  // Find target block
  let targetLoc = null;
  for (let i = 1; i <= 5; i++) {
    const checkLoc = {
      x: Math.floor(playerLoc.x + viewDirection.x * i),
      y: Math.floor(playerLoc.y + viewDirection.y * i + 1),
      z: Math.floor(playerLoc.z + viewDirection.z * i)
    };
    
    try {
      const block = player.dimension.getBlock(checkLoc);
      if (block && block.isSolid && block.typeId !== "minecraft:bedrock") {
        targetLoc = checkLoc;
        break;
      }
    } catch (e) {
      // Continue searching
    }
  }
  
  if (!targetLoc) {
    player.sendMessage("§cNo valid blocks in range!");
    addMana(player, CONFIG.MINING_FOCUS_COST); // Refund
    return;
  }
  
  // Mine 3x3x3 cube centered on target
  let blocksRemoved = 0;
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const mineLoc = {
          x: targetLoc.x + x,
          y: targetLoc.y + y,
          z: targetLoc.z + z
        };
        
        try {
          const block = player.dimension.getBlock(mineLoc);
          if (block && block.typeId !== "minecraft:air" && 
              block.typeId !== "minecraft:bedrock" && 
              block.typeId !== "minecraft:barrier") {
            
            // Spawn particles
            player.dimension.spawnParticle("minecraft:block_destruct", {
              x: mineLoc.x + 0.5,
              y: mineLoc.y + 0.5,
              z: mineLoc.z + 0.5
            });
            
            block.setType("minecraft:air");
            blocksRemoved++;
          }
        } catch (e) {
          // Skip if chunk unloaded
        }
      }
    }
  }
  
  if (blocksRemoved > 0) {
    player.playSound("dig.stone");
    player.sendMessage(`§6§o*Excavated ${blocksRemoved} blocks*`);
  }
}

// Flying broom functions
function startFlying(player) {
  const data = getPlayerData(player);
  if (!data.awakened) {
    player.sendMessage("§cYou must awaken your magic first!");
    return false;
  }
  
  data.isFlying = true;
  player.addEffect("slow_falling", 999999, { amplifier: 0, showParticles: false });
  player.sendMessage("§d§o*Broom activated*");
  player.playSound("mob.enderdragon.flap");
  return true;
}

function stopFlying(player) {
  const data = getPlayerData(player);
  data.isFlying = false;
  data.flyingTicks = 0;
  player.removeEffect("slow_falling");
  player.sendMessage("§7§o*Broom deactivated*");
}

function updateFlying(player) {
  const data = getPlayerData(player);
  
  if (!data.isFlying) return;
  
  // Check if player still has broom equipped
  const inventory = player.getComponent("inventory");
  const mainhand = inventory?.container?.getItem(player.selectedSlotIndex);
  
  if (!mainhand || mainhand.typeId !== "magic:flying_broom") {
    stopFlying(player);
    return;
  }
  
  // Apply flight movement
  const viewDirection = player.getViewDirection();
  const velocity = player.getVelocity();
  
  // Forward movement based on view direction
  const moveX = viewDirection.x * CONFIG.BROOM_SPEED;
  const moveZ = viewDirection.z * CONFIG.BROOM_SPEED;
  
  // Vertical movement based on pitch
  let moveY = velocity.y;
  if (player.isJumping) {
    moveY = CONFIG.BROOM_VERTICAL_SPEED;
  } else if (player.isSneaking) {
    moveY = -CONFIG.BROOM_VERTICAL_SPEED;
  } else {
    // Maintain altitude with slight hover
    moveY = Math.max(-0.1, Math.min(0.1, moveY));
  }
  
  // Apply velocity
  try {
    player.applyKnockback(moveX, moveZ, 0, moveY);
  } catch (e) {
    // Velocity application failed
  }
  
  // Spawn particle trail
  data.flyingTicks++;
  if (data.flyingTicks % 3 === 0) {
    const particleLoc = {
      x: player.location.x,
      y: player.location.y + 0.5,
      z: player.location.z
    };
    player.dimension.spawnParticle("minecraft:dragon_breath_trail", particleLoc);
  }
}

// Main game loop
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    const data = initPlayerData(player);
    
    // Apply attribute buffs if enhanced
    applyAttributeBuffs(player);
    
    // Update flying broom
    updateFlying(player);
    
    // Mana regeneration (always regenerate, even while flying now)
    if (data.awakened && data.mana < data.maxMana) {
      data.mana = Math.min(data.mana + CONFIG.MANA_REGEN_RATE, data.maxMana);
      savePlayerData(player, data);
      updateManaDisplay(player);
    }
    
    // Update display
    if (data.awakened) {
      updateManaDisplay(player);
    }
    
    // Track sneak duration for held sneak detection
    const isSneaking = player.isSneaking;
    const now = Date.now();
    
    if (isSneaking && !data.isSneaking) {
      // Just started sneaking
      data.sneakStartTime = now;
    } else if (!isSneaking && data.isSneaking) {
      // Just stopped sneaking
      data.sneakStartTime = 0;
    }
    
    // Calculate sneak duration
    if (isSneaking && data.sneakStartTime > 0) {
      data.sneakDuration = now - data.sneakStartTime;
    } else {
      data.sneakDuration = 0;
    }
    
    data.isSneaking = isSneaking;
  }
}, CONFIG.MANA_REGEN_INTERVAL);

// Item use events
world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const item = event.itemStack;
  
  if (!item) return;
  
  const data = getPlayerData(player);
  
  switch (item.typeId) {
    case "magic:awakening_elixir":
      awakenPlayer(player);
      break;
    case "magic:mana_potion":
      addMana(player, 50);
      player.sendMessage("§bMana restored!");
      player.playSound("random.drink");
      break;
    case "magic:mana_enhancement_potion":
      increaseMaxMana(player, CONFIG.MANA_ENHANCEMENT_AMOUNT);
      player.playSound("random.drink");
      break;
    case "magic:attribute_enhancement_potion":
      enhanceAttributes(player);
      player.playSound("random.drink");
      break;
    
    // CONSOLIDATED FIRE STAFF
    case "magic:fire_staff":
      // Check if player has been sneaking for 2+ seconds
      if (player.isSneaking && data.isSneaking) {
        // Hold sneak 2 sec + Right-Click = Magma Wall
        castMagmaWall(player);
        data.sneakStartTime = 0; // Reset so it doesn't spam
      } else if (player.isSneaking) {
        // Quick Sneak + Right-Click = Dragon Breath
        castDragonBreath(player);
      } else {
        // Right-Click = Fireball
        castFireball(player);
      }
      break;
    
    // Other abilities (will consolidate later)
    case "magic:shield_amulet":
      castShield(player);
      break;
    case "magic:heal_staff":
      castHeal(player);
      break;
    case "magic:disintegrate_wand":
      castDisintegrate(player);
      break;
    case "magic:ice_staff":
      castIceLance(player);
      break;
    case "magic:freeze_crystal":
      castFreezeWater(player);
      break;
    case "magic:trap_orb":
      castTrap(player);
      break;
    case "magic:lightning_staff":
      castLightning(player);
      break;
    case "magic:magic_missile_wand":
      castMagicMissile(player);
      break;
    case "magic:earth_staff":
      castEarthSpike(player);
      break;
    case "magic:earth_wall_totem":
      castEarthWall(player);
      break;
    case "magic:mining_focus":
      castMiningFocus(player);
      break;
    case "magic:flying_broom":
      if (data.isFlying) {
        stopFlying(player);
      } else {
        startFlying(player);
      }
      break;
  }
});

world.sendMessage("§d§lMagic System Loaded!");