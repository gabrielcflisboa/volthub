package com.volthub.station.config;

import com.volthub.station.application.port.in.ManageStationsUseCase;
import com.volthub.station.application.port.in.ProjectAvailabilityUseCase;
import com.volthub.station.application.port.in.QueryAvailabilityUseCase;
import com.volthub.station.application.port.out.AvailabilityReadModel;
import com.volthub.station.application.port.out.StationRepository;
import com.volthub.station.application.service.AvailabilityProjectionService;
import com.volthub.station.application.service.AvailabilityQueryService;
import com.volthub.station.application.service.StationCommandService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Composição: é aqui (e só aqui) que o núcleo hexagonal encontra o Spring. */
@Configuration
public class StationBeans {

    @Bean
    ManageStationsUseCase manageStations(StationRepository stations, AvailabilityReadModel readModel) {
        return new StationCommandService(stations, readModel);
    }

    @Bean
    QueryAvailabilityUseCase queryAvailability(StationRepository stations, AvailabilityReadModel readModel) {
        return new AvailabilityQueryService(stations, readModel);
    }

    @Bean
    ProjectAvailabilityUseCase projectAvailability(AvailabilityReadModel readModel) {
        return new AvailabilityProjectionService(readModel);
    }
}
