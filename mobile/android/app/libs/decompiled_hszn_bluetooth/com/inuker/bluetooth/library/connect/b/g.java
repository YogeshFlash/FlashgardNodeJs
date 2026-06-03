/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.connect.b;

import com.inuker.bluetooth.library.connect.b.i;
import com.inuker.bluetooth.library.connect.c.b;

public class g
extends i
implements com.inuker.bluetooth.library.connect.listener.g {
    public g(b b2) {
        super(b2);
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
        if (!this.g()) {
            this.c(-1);
        } else {
            this.o();
        }
    }

    @Override
    public void a(int n2, int n3) {
        this.p();
        if (n3 == 0) {
            this.a("extra.rssi", n2);
            this.c(0);
        } else {
            this.c(-1);
        }
    }
}

