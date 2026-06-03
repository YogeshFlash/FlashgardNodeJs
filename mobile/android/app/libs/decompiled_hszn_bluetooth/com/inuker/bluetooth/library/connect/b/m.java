/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothGattCharacteristic
 */
package com.inuker.bluetooth.library.connect.b;

import android.bluetooth.BluetoothGattCharacteristic;
import com.inuker.bluetooth.library.connect.b.i;
import com.inuker.bluetooth.library.connect.c.b;
import com.inuker.bluetooth.library.connect.listener.j;
import java.util.UUID;

public class m
extends i
implements j {
    private UUID p;
    private UUID q;
    private byte[] r;

    public m(UUID uUID, UUID uUID2, byte[] byArray, b b2) {
        super(b2);
        this.p = uUID;
        this.q = uUID2;
        this.r = byArray;
    }

    @Override
    public void i() {
        switch (this.e()) {
            case 0: {
                this.c(-1);
                break;
            }
            case 2: {
                this.q();
                break;
            }
            case 19: {
                this.q();
                break;
            }
            default: {
                this.c(-1);
            }
        }
    }

    private void q() {
        if (!this.a(this.p, this.q, this.r)) {
            this.c(-1);
        } else {
            this.o();
        }
    }

    @Override
    public void a(BluetoothGattCharacteristic bluetoothGattCharacteristic, int n2, byte[] byArray) {
        this.p();
        if (n2 == 0) {
            this.c(0);
        } else {
            this.c(-1);
        }
    }
}

