/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothGattDescriptor
 */
package com.inuker.bluetooth.library.connect.b;

import android.bluetooth.BluetoothGattDescriptor;
import com.inuker.bluetooth.library.connect.b.i;
import com.inuker.bluetooth.library.connect.c.b;
import java.util.UUID;

public class k
extends i
implements com.inuker.bluetooth.library.connect.listener.k {
    private UUID p;
    private UUID q;
    private UUID r;
    private byte[] s;

    public k(UUID uUID, UUID uUID2, UUID uUID3, byte[] byArray, b b2) {
        super(b2);
        this.p = uUID;
        this.q = uUID2;
        this.r = uUID3;
        this.s = byArray;
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
        if (!this.a(this.p, this.q, this.r, this.s)) {
            this.c(-1);
        } else {
            this.o();
        }
    }

    @Override
    public void a(BluetoothGattDescriptor bluetoothGattDescriptor, int n2) {
        this.p();
        if (n2 == 0) {
            this.c(0);
        } else {
            this.c(-1);
        }
    }
}

