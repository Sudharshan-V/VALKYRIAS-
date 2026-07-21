package com.valkyrias.agency.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ExistingSchemaMappingTest {

    @Test
    void projectProgressUsesWholeNumberAndContributorsUseTextArray() throws Exception {
        assertThat(Project.class.getDeclaredField("progress").getType()).isEqualTo(Integer.class);
        assertThat(Project.class.getDeclaredField("contributors").getType()).isEqualTo(String[].class);
    }

    @Test
    void planFeaturesUseTextArray() throws Exception {
        assertThat(Plan.class.getDeclaredField("features").getType()).isEqualTo(String[].class);
    }
}
