package com.volthub.gateway.mqtt;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.paho.client.mqttv3.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MqttBridgeTest {

    final MqttAsyncClient client = mock(MqttAsyncClient.class);
    final MqttBridge bridge = new MqttBridge("tcp://localhost:1883", mock(KafkaTemplate.class), new ObjectMapper());

    MqttBridgeTest() {
        ReflectionTestUtils.setField(bridge, "client", client);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void assinaturaNaoEsperaSubackDentroDoCallback(boolean reconnect) throws Exception {
        var token = mock(IMqttToken.class);
        when(client.subscribe(eq(MqttBridge.INBOUND), eq(1), isNull(), any(IMqttActionListener.class)))
                .thenReturn(token);

        bridge.connectComplete(reconnect, "tcp://localhost:1883");

        verify(client).subscribe(eq(MqttBridge.INBOUND), eq(1), isNull(), any(IMqttActionListener.class));
        verifyNoInteractions(token);
    }

    @Test
    void comandoEsperaConfirmacaoQos1EPropagaFalhaAoConsumidorKafka() throws Exception {
        var token = mock(IMqttDeliveryToken.class);
        var failure = new MqttException(MqttException.REASON_CODE_CLIENT_NOT_CONNECTED);
        when(client.publish(anyString(), any(MqttMessage.class))).thenReturn(token);
        doThrow(failure).when(token).waitForCompletion();

        assertSame(failure, assertThrows(MqttException.class,
                () -> bridge.publishCommand("BH-SAV-01", new byte[]{1})));

        var message = ArgumentCaptor.forClass(MqttMessage.class);
        verify(client).publish(eq("volthub/chargers/BH-SAV-01/commands"), message.capture());
        assertEquals(1, message.getValue().getQos());
        assertArrayEquals(new byte[]{1}, message.getValue().getPayload());
        verify(token).waitForCompletion();
    }
}
