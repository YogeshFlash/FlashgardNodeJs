/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library;

import com.inuker.bluetooth.library.connect.a.a;
import com.inuker.bluetooth.library.connect.c.c;
import com.inuker.bluetooth.library.connect.c.e;
import com.inuker.bluetooth.library.connect.c.f;
import com.inuker.bluetooth.library.connect.c.i;
import com.inuker.bluetooth.library.connect.listener.BluetoothStateListener;
import com.inuker.bluetooth.library.d.a.d;
import com.inuker.bluetooth.library.search.c.b;
import com.inuker.bluetooth.library.search.g;
import java.util.UUID;

public interface j {
    public void a(String var1, a var2, com.inuker.bluetooth.library.connect.c.a var3);

    public void a(String var1);

    public void a(String var1, com.inuker.bluetooth.library.connect.listener.a var2);

    public void b(String var1, com.inuker.bluetooth.library.connect.listener.a var2);

    public void a(String var1, UUID var2, UUID var3, e var4);

    public void a(String var1, UUID var2, UUID var3, byte[] var4, com.inuker.bluetooth.library.connect.c.j var5);

    public void a(String var1, UUID var2, UUID var3, UUID var4, e var5);

    public void a(String var1, UUID var2, UUID var3, UUID var4, byte[] var5, com.inuker.bluetooth.library.connect.c.j var6);

    public void b(String var1, UUID var2, UUID var3, byte[] var4, com.inuker.bluetooth.library.connect.c.j var5);

    public void a(String var1, UUID var2, UUID var3, com.inuker.bluetooth.library.connect.c.d var4);

    public void a(String var1, UUID var2, UUID var3, i var4);

    public void b(String var1, UUID var2, UUID var3, com.inuker.bluetooth.library.connect.c.d var4);

    public void b(String var1, UUID var2, UUID var3, i var4);

    public void a(String var1, f var2);

    public void a(String var1, int var2, c var3);

    public void a(g var1, b var2);

    public void a();

    public void a(BluetoothStateListener var1);

    public void b(BluetoothStateListener var1);

    public void a(d var1);

    public void b(d var1);

    public void a(String var1, int var2);

    public void d(String var1);
}

