package com.valkyrias.agency.model;

import jakarta.persistence.Column;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class FinancialColumnMappingTest {

    @Test
    void monetaryFieldsUseBigDecimalWithExplicitPrecisionAndScale() throws NoSuchFieldException {
        assertMoneyColumn(ActionItem.class, "budget");
        assertMoneyColumn(Project.class, "budget");
        assertMoneyColumn(AppSetting.class, "totalContract");
        assertMoneyColumn(AppSetting.class, "paidToDate");
        assertMoneyColumn(AppSetting.class, "nextInvoice");
        assertMoneyColumn(Payment.class, "amount");
        assertMoneyColumn(Payment.class, "orderAmount");
        assertMoneyColumn(Payment.class, "depositAmount");
        assertMoneyColumn(Payment.class, "discountAmount");
        assertMoneyColumn(Payment.class, "gstAmount");
    }

    private static void assertMoneyColumn(Class<?> entityType, String fieldName) throws NoSuchFieldException {
        Field field = entityType.getDeclaredField(fieldName);
        assertEquals(BigDecimal.class, field.getType(), entityType.getSimpleName() + "." + fieldName);

        Column column = field.getAnnotation(Column.class);
        assertNotNull(column, entityType.getSimpleName() + "." + fieldName + " must declare @Column");
        assertEquals(19, column.precision(), entityType.getSimpleName() + "." + fieldName + " precision");
        assertEquals(2, column.scale(), entityType.getSimpleName() + "." + fieldName + " scale");
    }
}
