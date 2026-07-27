<?php

declare(strict_types=1);

it('reports a healthy status', function () {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertJson(['status' => 'ok']);
});
