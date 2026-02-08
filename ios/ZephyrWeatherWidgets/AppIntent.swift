//
//  AppIntent.swift
//  ZephyrWeatherWidgets
//

import WidgetKit
import AppIntents

// Location entity for widget configuration
struct LocationEntity: AppEntity {
    let id: String
    let name: String
    
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Location"
    static var defaultQuery = LocationQuery()
    
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

// Query to provide available locations
struct LocationQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [LocationEntity] {
        let allLocations = loadLocationsFromSharedContainer()
        return allLocations.filter { identifiers.contains($0.id) }
    }
    
    func suggestedEntities() async throws -> [LocationEntity] {
        return loadLocationsFromSharedContainer()
    }
    
    func defaultResult() async -> LocationEntity? {
        return loadLocationsFromSharedContainer().first
    }
    
    private func loadLocationsFromSharedContainer() -> [LocationEntity] {
        guard let userDefaults = UserDefaults(suiteName: "group.com.zephyrweather.shared"),
              let jsonString = userDefaults.string(forKey: "locations"),
              let data = jsonString.data(using: .utf8),
              let locationsList = try? JSONDecoder().decode([SharedLocation].self, from: data) else {
            return []
        }
        
        return locationsList.map { location in
            LocationEntity(id: location.id, name: location.name)
        }
    }
}

// Simplified location structure for shared storage
struct SharedLocation: Codable {
    let id: String
    let name: String
}

struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Configuration"
    static var description = IntentDescription("Choose a location for your weather widget.")
    
    @Parameter(title: "Location")
    var location: LocationEntity?
}
